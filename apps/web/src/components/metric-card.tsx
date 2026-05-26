import { Card, Flex, Typography } from "antd";

type MetricCardProps = {
  label: string;
  value: string;
  helper?: string;
  tone?: "blue" | "green" | "amber" | "red";
  accent?: string;
  eyebrow?: string;
  spark?: number[];
};

export function MetricCard({ label, value, helper, tone = "blue", accent, eyebrow, spark = [] }: MetricCardProps) {
  const max = Math.max(...spark, 1);

  return (
    <Card className={`metric-card metric-card--${tone}`}>
      <Flex vertical gap={12}>
        <Flex justify="space-between" align="flex-start" gap={12}>
          <Flex vertical gap={4}>
            {eyebrow ? <Typography.Text className="metric-card__eyebrow">{eyebrow}</Typography.Text> : null}
            <Typography.Text className="metric-card__label">{label}</Typography.Text>
          </Flex>
          <span className="metric-card__orb" aria-hidden="true" />
        </Flex>
        <Flex vertical gap={6}>
          <Typography.Title level={2} className="metric-card__value">
            {value}
          </Typography.Title>
          {helper ? <Typography.Text className="metric-card__helper">{helper}</Typography.Text> : null}
        </Flex>
        {spark.length > 0 ? (
          <div className="metric-card__spark" aria-hidden="true">
            {spark.map((point, index) => (
              <span
                key={`${label}-${index}`}
                style={{
                  height: `${Math.max(18, Math.round((point / max) * 100))}%`,
                  opacity: 0.52 + (index / Math.max(spark.length - 1, 1)) * 0.34,
                }}
              />
            ))}
          </div>
        ) : null}
        {accent ? <Typography.Text className="metric-card__accent">{accent}</Typography.Text> : null}
      </Flex>
    </Card>
  );
}
