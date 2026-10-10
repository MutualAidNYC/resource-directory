"""Fixtures for the application_layer tests, built from sample_pull.py."""
import pytest

from application_layer.publish import Published, select
from application_layer.taxonomies import Terms
from data_layer.dataset import Dataset
from tests.unit.application_layer.sample_pull import pull

@pytest.fixture
def dataset() -> Dataset:
    return Dataset.from_pull(pull())


@pytest.fixture
def published(dataset: Dataset) -> Published:
    return select(dataset)


@pytest.fixture
def terms(dataset: Dataset) -> Terms:
    return Terms.from_dataset(dataset)
