import os
import re
import base64
import hashlib
import requests
from markdown import markdown
from xhtml2pdf import pisa

def process_mermaid_blocks(md_content, docs_dir):
    # Garantir que a pasta de imagens dos diagramas existe
    images_dir = os.path.join(docs_dir, "images")
    os.makedirs(images_dir, exist_ok=True)
    
    # Regex para encontrar blocos ```mermaid ... ```
    pattern = re.compile(r"```mermaid\n(.*?)\n```", re.DOTALL)
    
    def replacer(match):
        mermaid_code = match.group(1).strip()
        
        # Gerar um hash único para este diagrama
        code_hash = hashlib.md5(mermaid_code.encode("utf-8")).hexdigest()
        image_name = f"mermaid_{code_hash}.png"
        image_path = os.path.join(images_dir, image_name)
        absolute_path = os.path.abspath(image_path).replace("\\", "/")  # Formato universal
        
        # Se a imagem já existe localmente, apenas retorna a tag img
        if os.path.exists(image_path):
            print(f" - Diagrama em cache carregado: {image_name}")
            return f'<p class="text-center"><img src="{absolute_path}" class="mermaid-diagram" style="max-width: 100%; max-height: 380px; margin: 15px auto;" /></p>'
            
        # Caso contrário, faz o download do diagrama renderizado usando a API do mermaid.ink
        print(f" - Renderizando diagrama via mermaid.ink: {image_name}...")
        try:
            encoded_code = base64.b64encode(mermaid_code.encode("utf-8")).decode("utf-8")
            url = f"https://mermaid.ink/img/{encoded_code}"
            
            response = requests.get(url, timeout=20)
            if response.status_code == 200:
                with open(image_path, "wb") as img_file:
                    img_file.write(response.content)
                print("   [OK] Diagrama baixado e salvo com sucesso!")
                return f'<p class="text-center"><img src="{absolute_path}" class="mermaid-diagram" style="max-width: 100%; max-height: 380px; margin: 15px auto;" /></p>'
            else:
                print(f"   [AVISO] API retornou status {response.status_code}, usando fallback de código.")
        except Exception as e:
            print(f"   [AVISO] Erro de rede ao conectar com mermaid.ink ({e}), usando fallback.")
            
        # Fallback de segurança: bloco de código com formatação legível (fundo escuro, texto claro)
        escaped_code = mermaid_code.replace("<", "&lt;").replace(">", "&gt;")
        return f'<pre class="mermaid-fallback" style="background-color: #1a202c; color: #edf2f7; border: 1px solid #4a5568; padding: 10px; border-radius: 6px; font-family: monospace; font-size: 8.5pt;"><code>{escaped_code}</code></pre>'
        
    return pattern.sub(replacer, md_content)

def generate_pdf():
    docs_dir = "docs"
    output_pdf = os.path.join(docs_dir, "CPJ_Cobranca_AI_Documentacao.pdf")
    
    print("Iniciando compilação da documentação...")
    
    # 1. Obter e ordenar os arquivos markdown de 01 a 15
    files = [f for f in os.listdir(docs_dir) if f.endswith(".md") and re.match(r"^\d+-", f)]
    files.sort(key=lambda x: int(x.split("-")[0]))
    
    if not files:
        print("Nenhum arquivo markdown de documentação (01-*, 02-*, etc.) encontrado na pasta docs.")
        return
        
    print(f"Arquivos encontrados: {len(files)}")
    
    # 2. Ler todos os arquivos, processar diagramas e converter para HTML
    chapters_html = []
    for file_name in files:
        file_path = os.path.join(docs_dir, file_name)
        print(f"Lendo e processando: {file_name}...")
        
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        # Processar blocos do mermaid transformando em imagens
        processed_content = process_mermaid_blocks(content, docs_dir)
            
        # Converter markdown para HTML usando extensões adicionais
        html_content = markdown(processed_content, extensions=["extra"])
        
        # Remover tag <code> de dentro de <pre> para evitar conflitos de estilo no xhtml2pdf
        html_content = html_content.replace("</code></pre>", "</pre>")
        html_content = re.sub(r"<pre><code[^>]*>", "<pre>", html_content)
        
        chapters_html.append(f"""
        <div class="chapter-container">
            {html_content}
        </div>
        """)

    # 3. Criar a estrutura completa do HTML com estilização premium usando Frames do xhtml2pdf
    full_html = f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        /* Template padrão (sem cabeçalho/rodapé, usado para a capa) */
        @page {{
            size: a4;
            margin: 2.5cm;
        }}
        
        /* Template principal (com cabeçalho/rodapé, usado para os capítulos) */
        @page main_template {{
            size: a4;
            margin-top: 2.8cm;
            margin-bottom: 2.5cm;
            margin-left: 2.5cm;
            margin-right: 2.5cm;
            
            @frame header_frame {{
                -pdf-frame-content: header_content;
                left: 2.5cm;
                width: 16cm;
                top: 1.2cm;
                height: 1cm;
            }}
            
            @frame footer_frame {{
                -pdf-frame-content: footer_content;
                left: 2.5cm;
                width: 16cm;
                bottom: 1cm;
                height: 1.2cm;
            }}
        }}
        
        html {{
            font-family: sans-serif;
            color: #2d3748;
            line-height: 1.6;
        }}
        
        body {{
            font-size: 10.5pt;
        }}
        
        /* Estilos do cabeçalho e rodapé dinâmicos */
        #header_content {{
            font-family: sans-serif;
            font-size: 8.5pt;
            color: #718096;
            border-bottom: 0.5px solid #cbd5e0;
            padding-bottom: 4px;
            text-align: right;
        }}
        
        #footer_content {{
            font-family: sans-serif;
            font-size: 8.5pt;
            color: #718096;
            border-top: 0.5px solid #cbd5e0;
            padding-top: 4px;
            text-align: right;
        }}
        
        /* Capa */
        .cover {{
            text-align: center;
            height: 100%;
        }}
        
        .cover-divider {{
            height: 4px;
            background: linear-gradient(90deg, #3182ce, #319795);
            margin: 40px auto;
            width: 80%;
        }}
        
        .cover-title {{
            font-size: 34pt;
            font-weight: bold;
            color: #1a365d;
            margin-top: 100px;
            margin-bottom: 20px;
            line-height: 1.2;
        }}
        
        .cover-subtitle {{
            font-size: 16pt;
            color: #4a5568;
            margin-bottom: 120px;
            font-weight: 500;
        }}
        
        .cover-meta {{
            font-size: 11pt;
            color: #718096;
            line-height: 1.8;
            margin-top: 200px;
        }}
        
        /* Estrutura de Capítulos */
        .chapter-container {{
            page-break-before: always;
        }}
        
        h1, h2, h3, h4, h5, h6 {{
            color: #1a365d;
            font-family: sans-serif;
            font-weight: bold;
            margin-top: 20pt;
            margin-bottom: 10pt;
        }}
        
        h1 {{
            font-size: 22pt;
            border-bottom: 2px solid #3182ce;
            padding-bottom: 8px;
            margin-top: 0;
            margin-bottom: 20pt;
        }}
        
        h2 {{
            font-size: 15pt;
            color: #2b6cb0;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
            margin-top: 25pt;
        }}
        
        h3 {{
            font-size: 12pt;
            color: #4a5568;
            margin-top: 18pt;
        }}
        
        p {{
            margin-bottom: 11pt;
            text-align: justify;
        }}
        
        ul, ol {{
            margin-bottom: 11pt;
            padding-left: 20px;
        }}
        
        li {{
            margin-bottom: 4pt;
        }}
        
        /* Código */
        code {{
            font-family: monospace;
            font-size: 9.5pt;
            background-color: #f7fafc;
            color: #c53030;
            padding: 1px 4px;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
        }}
        
        pre {{
            font-family: monospace;
            font-size: 9pt;
            background-color: #1a202c;
            color: #edf2f7;
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 14pt;
            line-height: 1.4;
        }}
        
        pre code {{
            background-color: transparent;
            color: inherit;
            border: 0;
            padding: 0;
        }}
        
        /* Citações */
        blockquote {{
            border-left: 4px solid #3182ce;
            background-color: #ebf8ff;
            padding: 10px 15px;
            margin: 12pt 0;
            color: #2b6cb0;
        }}
        
        /* Tabelas */
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 10pt;
            margin-bottom: 16pt;
            font-size: 9pt;
        }}
        
        th, td {{
            border: 1px solid #e2e8f0;
            padding: 6pt 8pt;
            text-align: left;
        }}
        
        th {{
            background-color: #ebf8ff;
            color: #2c5282;
            font-weight: bold;
        }}
        
        tr:nth-child(even) {{
            background-color: #f7fafc;
        }}
        
        /* Classes auxiliares */
        .text-center {{ text-align: center; }}
        .font-bold {{ font-weight: bold; }}
    </style>
</head>
<body>
    <!-- Elementos estáticos do cabeçalho e rodapé para o main_template -->
    <div id="header_content">
        CPJ-Cobrança AI &mdash; Documentação Técnica
    </div>
    
    <div id="footer_content">
        Manual Técnico &mdash; Página <pdf:pagenumber> de <pdf:pagecount>
    </div>

    <!-- Página de Capa -->
    <div class="cover">
        <div class="cover-title">CPJ-Cobrança AI</div>
        <div class="cover-subtitle">Manual Técnico & Documentação de Arquitetura</div>
        <div class="cover-divider"></div>
        <div class="cover-meta">
            <strong>Desafio Técnico Dev Pleno</strong><br>
            Solução de Agente de IA para Apoio de Processo de Desenvolvimento<br>
            <br><br>
            <strong>Autor:</strong> Cledson Santos<br>
            <strong>Data:</strong> Maio de 2026<br>
            <strong>Versão:</strong> 1.0.0
        </div>
    </div>

    <!-- Mudar para o template principal com cabeçalho/rodapé e ir para a próxima página -->
    <pdf:nexttemplate name="main_template" />
    
    <!-- Capítulos compilados -->
    {"".join(chapters_html)}
</body>
</html>
"""

    # 4. Compilar para PDF usando xhtml2pdf
    print(f"Escrevendo PDF final em: {output_pdf}...")
    with open(output_pdf, "w+b") as out_file:
        pisa_status = pisa.CreatePDF(full_html, dest=out_file)
        
    if pisa_status.err:
        print("Erro ao gerar o PDF!")
    else:
        print("PDF gerado com absoluto sucesso!")

if __name__ == "__main__":
    generate_pdf()
