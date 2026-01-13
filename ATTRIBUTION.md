# ATTRIBUTION

This file lists the sources of external data used in this project and provides proper attribution according to their licenses.
All processing, cleaning, merging, and de-duplication were performed by the authors and do not imply endorsement by the original data providers.

## ROR Dataset

This project incorporates data from the **Research Organization Registry (ROR)**, a global, open registry of research organizations.

- **Source:** Research Organization Registry (ROR)
  Website: [https://ror.org](https://ror.org)
- **Version/DOI:** v1.74, [10.5281/zenodo.17703052](https://doi.org/10.5281/zenodo.17703052)
- **License:** CC0 1.0 Universal Public Domain Dedication
  License URL: [https://creativecommons.org/publicdomain/zero/1.0/](https://creativecommons.org/publicdomain/zero/1.0/)
- **Retrieved on:** 1 December 2025
- **Data coverage:** 120,196 institutions

## OpenAlex Dataset

This project incorporates data obtained from **OpenAlex**, an open catalog of scholarly works, authors, institutions, venues, and concepts developed by OurResearch.

- **Source:** OpenAlex
  Website: [https://openalex.org](https://openalex.org)
- **License:** CC0 1.0 Universal Public Domain Dedication
  License URL: [https://creativecommons.org/publicdomain/zero/1.0/](https://creativecommons.org/publicdomain/zero/1.0/)
- **Retrieved on:** 1 December 2025 via the OpenAlex API
- **Data coverage:** 115,781 institutions

## Merged Institution Dataset

- Data from ROR and OpenAlex were **merged and de-duplicated**.
- Only fields required for country resolution (institution name, known aliases, city, and country) were retained.
- The resulting publicly shared file:
  - [`institutionList.json`](./institutionList.json) contains the combined institution list (**120,428 institutions**)

## Country Data

Country names, alpha-3 codes and aliases are based on **ISO 3166 standards** published by the International Organization for Standardization.
Alternative names and aliases were compiled from public sources, including GeoNames, UN terminology, and common usage.

- The resulting publicly shared file:
  - [`countryList.json`](./countryList.json) contains 193 UN member states, 2 permanent observer states, plus additional territories (**203 countries**)
- **Notes:** Some alpha-3 codes may be missing for non-standard entries. Aliases include both official and common vernacular names.
