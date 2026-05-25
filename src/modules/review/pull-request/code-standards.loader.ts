import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { GenericError } from "@/infrastructure/errors";
import type { CodeStandardDocument, CodeStandardsLoader } from "./models";

type Technology = CodeStandardDocument["technology"];

const TECHNOLOGY_FILES: Record<Technology, string> = {
  "node-typescript": "node-typescript.md",
  php: "php.md",
  python: "python.md",
};

export class FileSystemCodeStandardsLoader implements CodeStandardsLoader {
  constructor(private readonly standardsDir = resolve(process.cwd(), "code-standards")) {}

  async loadForFiles(filePaths: string[]): Promise<CodeStandardDocument[]> {
    const technologies = uniqueTechnologies(filePaths);
    const documents: CodeStandardDocument[] = [];

    for (const technology of technologies) {
      const fileName = TECHNOLOGY_FILES[technology];
      try {
        documents.push({
          technology,
          content: await readFile(resolve(this.standardsDir, fileName), "utf8"),
        });
      } catch (error) {
        throw new GenericError(`Padrao de codigo ${technology} nao encontrado.`, error);
      }
    }

    return documents;
  }
}

function uniqueTechnologies(filePaths: string[]): Technology[] {
  const technologies: Technology[] = [];

  for (const filePath of filePaths) {
    const technology = technologyForPath(filePath);
    if (technology && !technologies.includes(technology)) {
      technologies.push(technology);
    }
  }

  return technologies;
}

function technologyForPath(filePath: string): Technology | null {
  const normalized = filePath.toLowerCase();

  if (/\.(ts|tsx|js|jsx)$/.test(normalized)) {
    return "node-typescript";
  }

  if (normalized.endsWith(".php")) {
    return "php";
  }

  if (normalized.endsWith(".py")) {
    return "python";
  }

  return null;
}
