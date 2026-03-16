# Load Testing Strategy: Institutional Readiness

This document outlines how to test the platform's capacity using **Artillery.io** (recommended for its simplicity and YAML configuration).

## 1. Prerequisites
- Node.js installed.
- Install Artillery globally: `npm install -g artillery`

## 2. Test Configuration (`scripts/load-test.yml`)

Create a file named `scripts/load-test.yml` with the following content (adjust the target URL to your production or staging URL):

```yaml
config:
  target: "https://your-project-url.vercel.app"
  phases:
    - duration: 60
      arrivalRate: 5
      name: Warm up
    - duration: 120
      arrivalRate: 10
      rampTo: 50
      name: Ramp up to 50 concurrent users
    - duration: 300
      arrivalRate: 50
      name: Sustained load (50 users/sec)
  payload:
    # Optional: If you want to test specific profile IDs
    path: "profiles.csv"
    fields:
      - "id"

scenarios:
  - name: "Public User Flow"
    flow:
      - get:
          url: "/"
      - think: 2
      - get:
          url: "/partidos"
      - think: 3
      - get:
          url: "/perfil/{{ id }}" # Uses payload if available
```

## 3. Running the Test
To execute the test and generate a report:
`artillery run --output report.json scripts/load-test.yml`

To view the report in your browser:
`artillery report report.json`

## 4. What to Watch In Supabase Dashboard
During the test, monitor these metrics in your Supabase Console:
1. **API Requests**: Monitor for generic 429 (Too Many Requests) errors.
2. **Realtime Connections**: Check if you exceed the limit of your plan (Free plan usually supports 200 concurrent connections).
3. **Database CPU**: Ensure it stays below 80% to avoid lag for real users.

## 5. Summary Recommendation
For an institutional event with ~1000 participants:
- Ensure you are on a **Pro Plan** in Supabase to handle the increased Realtime connection limit.
- Enable **Edge Caching** where possible for static data.
