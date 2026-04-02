export function GET() {
  return new Response("User-agent: *\nDisallow: /", {
    headers: { "content-type": "text/plain" },
  });
}
