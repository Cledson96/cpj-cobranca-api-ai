type JsonViewerProps = {
  value: unknown;
};

export function JsonViewer({ value }: JsonViewerProps) {
  return (
    <div className="json-viewer">
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}
