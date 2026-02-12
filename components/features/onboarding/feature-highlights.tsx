import { Card, CardContent } from "@/components/ui/card"

const features = [
  {
    title: "Track",
    description: "Log and categorize all company expenses",
  },
  {
    title: "Analyze",
    description: "View spending insights and reports",
  },
  {
    title: "Collaborate",
    description: "Work together with your team",
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
