# Contributing

This project turns Mutual Aid NYC's Airtable data into a static website and a read-only [HSDS](https://docs.openreferral.org/) API. See the [README](README.md) for how it works.

## Report a bug

Open an issue with:

- the steps to reproduce it
- what you expected and what happened
- your OS, and your Python or Node version

Please report security problems privately to the maintainers, not in a public issue.

## Suggest a feature

Open an issue that describes the feature and who it helps.

## Contribute code

1. Fork the repository, clone your fork, then follow the [Quick Start](README.md#quick-start) in the README.
2. In your fork, create a branch from `main`. Update your fork's `main` from MutualAidNYC/resource-directory first.
3. Make your change, and update the README if it changes how something is set up or used.
4. Run the checks for the parts you changed:
   - Python: `pytest tests/unit` and `ruff check .`
   - `worker/`: `npm test` and `npm run typecheck`
   - `frontend/`: `npm run build`
5. Push the branch to your fork, and open a pull request against `main` in MutualAidNYC/resource-directory that says what changed and why.

## Guidelines

- **Accessibility.** Frontend changes must meet [WCAG 2.2 AA](https://www.w3.org/TR/WCAG22/).
- **Privacy.** Never commit `.env` files or tokens.
- **Terms.** Code, the API and backend docs use HSDS's terms, **service** and **organization**. Site text uses **resource** and **group**.
- **Python.** Follow [PEP 8](https://peps.python.org/pep-0008/), with type hints where practical, and give new functions a docstring.
- **TypeScript.** In `frontend/`, follow the ESLint configuration.
- **Commits.** Use [conventional commit](https://www.conventionalcommits.org/) prefixes, such as `feat:`, `fix:` and `docs:`.

## Questions

Open an issue.
