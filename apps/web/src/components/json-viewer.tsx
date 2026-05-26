import { Typography } from "antd";

type JsonViewerProps = {
  value: unknown;
};

export function JsonViewer({ value }: JsonViewerProps) {
  return (
    <Typography.Paragraph className="json-viewer">
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </Typography.Paragraph>
  );
}
