# skills

AI agent skills published and maintained by Skate. Each top-level folder is one self-contained skill with its own `SKILL.md`, `README.md`, and any supporting scripts or references it needs. They follow the [skill format](https://docs.claude.com/en/docs/claude-code/skills) used by Claude Code and any agent runtime compatible with it. Install individual skills with the [`skills`](https://github.com/vercel-labs/skills) CLI — pick the one you want, or pull more than one into the same project.

## Skills in this repo

| Skill                                 | What it does                                                                                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [`skate-skillpay`](./skate-skillpay/) | Pay per request for third-party APIs in stablecoins over [MPP](https://mpp.dev/overview) via Monad — no subscription, no API keys in the user's environment. |

More skills will land here over time. Each one lives under its own folder and ships with a per-skill README that is the authoritative doc — this top-level file only lists what exists and points at it.

## Install

Add a skill to an agent project (Claude Code or any compatible runtime) with the [`skills`](https://github.com/vercel-labs/skills) CLI:

```bash
npx skills add skate-org/skills --skill skate-skillpay
```

By default, the CLI drops the selected skill under the agent's skills directory in the current project (for Claude Code that's `.claude/skills/<skill-name>/`; add `-g` to install globally at `~/.claude/skills/` instead). `--skill` is required because this repo bundles multiple skills — omit it and the CLI will ask which one.

Any client-side dependencies each skill needs are installed from within the skill's own folder; see the per-skill README.

## Layout

```txt
skills/
├── README.md                 # this file — index of what's here
├── .gitignore
└── skate-skillpay/           # one skill per top-level folder
    ├── SKILL.md              # agent-facing instructions
    ├── README.md             # human-facing overview (authoritative)
    ├── LICENSE
    ├── references/           # loaded by the agent on demand
    └── scripts/              # any client-side code the agent executes
```

## License

Each skill ships its own `LICENSE` file in its folder. Check the per-skill `LICENSE` before using or redistributing.

## Related

- [Skill format reference](https://docs.claude.com/en/docs/claude-code/skills) — the shared `SKILL.md` / `references/` / `scripts/` convention
- [`skills` CLI](https://github.com/vercel-labs/skills) — install / update / remove skills in an agent project
- [Skate](https://skatechain.org)
