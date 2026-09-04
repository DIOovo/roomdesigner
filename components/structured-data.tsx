import { buildStructuredData } from "@/lib/site";

export function StructuredData() {
  const schemas = buildStructuredData();
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemas) }} />;
}
