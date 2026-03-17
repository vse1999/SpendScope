import { Card, CardContent } from "@/components/ui/card"

const features = [
  {
    title: "Capture",
    description: "Centralize team expenses in one workspace instead of scattered spreadsheets and chat",
  },
  {
    title: "Review",
    description: "Spot policy issues, budget pressure, and owner-level spend before close",
  },
  {
    title: "Control",
    description: "Manage roles, invites, and billing access with clear ownership",
  },
] as const

export function FeatureHighlights() {
  return (
    <div className="grid gap-4 md:grid-cols-3 max-w-3xl mx-auto">
      {features.map((feature) => (
        <Card key={feature.title} className="text-center">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary mb-1">{feature.title}</div>
            <p className="text-sm text-muted-foreground">{feature.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
