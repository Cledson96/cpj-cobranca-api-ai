import { Card, Flex, Typography } from "antd";

type MetricCardProps = {
  label: string;
  value: string;
  helper?: string;
  tone?: "blue" | "green" | "amber" | "red";
};

export function MetricCard({ label, value, helper, tone = "blue" }: MetricCardProps) {
  return (
    <Card className={`metric-card metric-card--${tone}`}>
      <Flex vertical gap={8}>
        <Typography.Text className="metric-card__label">{label}</Typography.Text>
        <Typography.Title level={2} className="metric-card__value">
          {value}
        </Typography.Title>
        {helper ? <Typography.Text className="metric-card__helper">{helper}</Typography.Text> : null}
      </Flex>
    </Card>
  );
}
