# Generated service proxies

The files under this folder mirror what `abp generate-proxy -t ng` emits for the
AutoReach API. They were hand-authored to the generator's own conventions so that
regenerating overwrites them cleanly rather than colliding with a different style.

To regenerate once the API is running:

```bash
# from the API solution
dotnet run --project src/AutoReach.HttpApi.Host

# from this Angular app, in another terminal
abp generate-proxy -t ng --url https://localhost:44320
```

The generator needs `rootNamespace` in `src/environments/environment.ts` (it is
`Mni.AutoReach`, matching `Directory.Build.props`) and it needs the API started with
`dotnet run` — IIS Express does not expose the API definition endpoint the generator
reads.

Only the modules the UI currently binds to are covered here: channels, contacts,
messaging, campaigns, analytics and billing. The generator will add the remaining
ones — automation, flows, library, pipeline, compliance, integrations and platform
administration — on the first real run.
