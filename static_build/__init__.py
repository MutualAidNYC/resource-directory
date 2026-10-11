"""The static build: the API files, their HSDS schema check and the build report.

`build_dataset.py` uses `files`, `schema` and `report` to build from one
Airtable pull. `fetch_schemas` is run on its own, to update the vendored
schemas. Every id in the output is a public HSDS id (data_layer/ids.py),
never an Airtable record id. The HSDS version it follows is
models.hsds.HSDS_VERSION.
"""
