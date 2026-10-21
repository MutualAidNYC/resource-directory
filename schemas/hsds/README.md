# HSDS JSON Schemas (vendored)

The build checks each record file it writes against these files
(`static_build/schema.py`). They are copied unchanged from the Open Referral
[Human Services Data Specification](https://github.com/openreferral/specification),
folder `schema/`. Each folder here holds the files from the release tag of the same name (`<version>/` comes from tag `v<version>`). Only the files the check uses are copied (listed in `static_build/fetch_schemas.py`).

To refresh them (for example, for a new HSDS release), change `HSDS_VERSION`
in `models/hsds.py` (and check the models against that release), update the schema links in `static_build/openapi.json` to the new tag (and check its routes and parameters against that release's `openapi.json`), then run from the repo root:

```bash
python -m static_build.fetch_schemas
```

## License

The HSDS schema files are © Open Referral, licensed under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). That license covers only the files in this folder, not the rest of this repository.
