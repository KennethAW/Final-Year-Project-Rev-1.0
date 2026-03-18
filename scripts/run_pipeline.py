#!/usr/bin/env python3
"""
Master Pipeline Runner
=======================
Downloads data, computes features, and runs EDA in one command.
"""

import argparse
import logging
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
)
logger = logging.getLogger(__name__)


def main():
    parser = argparse.ArgumentParser(description="FYP Data Pipeline Runner")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--live", action="store_true", help="Download live data from Yahoo Finance")
    group.add_argument("--synthetic", action="store_true", help="Generate synthetic data for testing")
    parser.add_argument("--no-eda", action="store_true", help="Skip EDA generation")
    parser.add_argument("--sentiment", action="store_true", help="Enable FinBERT sentiment (requires GPU)")
    args = parser.parse_args()

    # Step 1: Data
    if args.live:
        logger.info("Step 1: Downloading live data from Yahoo Finance")
        from data.ingestion import DataIngestor
        ingestor = DataIngestor()
        ingestor.fetch_all()
    else:
        logger.info("Step 1: Generating synthetic data")
        from data.synthetic import generate_all_synthetic_data
        generate_all_synthetic_data()

    # Step 2: Features
    logger.info("Step 2: Running feature pipeline for all tickers")
    from features.pipeline import FeaturePipeline
    pipeline = FeaturePipeline(use_sentiment=args.sentiment)
    pipeline.run_all()

    # Step 3: EDA
    if not args.no_eda:
        logger.info("Step 3: Running EDA")
        import importlib.util
        spec = importlib.util.spec_from_file_location(
            "eda", Path(__file__).resolve().parent.parent / "notebooks" / "01_EDA.py"
        )
        eda = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(eda)
        eda.run_full_eda()
    else:
        logger.info("Step 3: Skipped EDA (--no-eda)")

    logger.info("Pipeline complete!")


if __name__ == "__main__":
    main()
