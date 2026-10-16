"""The static build run on the application_layer sample pull."""
from typing import Any

from application_layer.map import map_data
from application_layer.publish import Published, select
from application_layer.taxonomies import Terms
from data_layer.dataset import Dataset
from static_build.files import ApiFile, api_files
from static_build.worker_data import worker_data
from tests.unit.application_layer.sample_pull import COMMUNITY, FOOD, SENIORS, edit, pull

BUILT_AT = "2026-10-10T00:00:00+00:00"

Pull = dict[str, list[dict[str, Any]]]


def build(raw: Pull) -> tuple[Dataset, Published, Terms, list[ApiFile]]:
    dataset = Dataset.from_pull(raw)
    published = select(dataset)
    terms = Terms.from_dataset(dataset)
    return dataset, published, terms, api_files(dataset, published, terms, BUILT_AT)


def files_for(raw: Pull) -> dict[str, ApiFile]:
    """The build's files by path."""
    _dataset, _published, _terms, files = build(raw)
    return {f.path: f for f in files}


def worker_data_for(raw: Pull) -> dict[str, Any]:
    """What the build writes to worker-data/data.json."""
    dataset, published, terms, _files = build(raw)
    return worker_data(dataset, published, terms, map_data(dataset, published, terms))


def complete_pull() -> Pull:
    """The sample with the descriptions HSDS requires (it leaves some out on purpose)."""
    raw = pull()
    edit(raw, COMMUNITY, description="Who a resource is for")
    edit(raw, FOOD, description="Food")
    edit(raw, SENIORS, description="Older neighbors")
    return raw


def nulls_in(value: object, path: str = "$") -> list[str]:
    """JSON paths of every null in a dumped output (must be none)."""
    if value is None:
        return [path]
    if isinstance(value, dict):
        return [p for k, v in value.items() for p in nulls_in(v, f"{path}.{k}")]
    if isinstance(value, list):
        return [p for i, v in enumerate(value) for p in nulls_in(v, f"{path}[{i}]")]
    return []
