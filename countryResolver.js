// ===============================================================
//                   COUNTRY RESOLVER MODULE
// ===============================================================

// This is the engine of the software.

// config.js is designed as a separate module for easy reference and maintenance

import { LIMIT, US_STATES, US_STATE_ABBREVIATIONS, DELIMITERS, REGEX_PATTERNS, RESOLUTION_SOURCES, SPECIAL_CASES, GEORGIA_CITIES, ONTARIO_CITIES, CONTRIBUTION_KEYWORDS } from './config.js';



// ===============================================================
//           TEXT STANDARDIZATION AND CLEANUP FUNCTIONS
// ===============================================================


// Standardizes affiliation text by removing diacritical marks, standardizing country abbreviations (U.S.A -> USA, U.K -> UK), normalizing quotes, and collapsing whitespace
export function standardizeAffiliationText(str) {

     if (!str || typeof str !== 'string') return '';

     // Normalize "Côte d'Ivoire" spelling variations to a consistent format
     str = str.replace(/\bC[oô]te\s*d[''´`’]Ivoire\b/gi, "Cote d'Ivoire");

     str = str.normalize('NFD').replace(REGEX_PATTERNS.DIACRITICS, '');
     str = str.replace(REGEX_PATTERNS.USA_VARIATIONS, 'USA');
     str = str.replace(REGEX_PATTERNS.UK_VARIATIONS, 'UK');
     str = str.replace(REGEX_PATTERNS.QUOTES, "'");
     str = str.replace(REGEX_PATTERNS.MULTIPLE_WHITESPACE, ' ');
     str = str.trim();

     return str;
 }


 // Cleans affiliation string by removing emails, phone numbers, postcodes, identifiers, and other non-geographic information
export function stripNonAffiliationContent(affil) {

    let result = affil
        .replace(REGEX_PATTERNS.ORCID_ROR_ISNI, ' ')
        .replace(REGEX_PATTERNS.CORRESPONDING_AUTHOR_NAME, '')
        .replace(REGEX_PATTERNS.EMAIL_LABELS, '')
        .replace(REGEX_PATTERNS.EMAIL_ADDRESSES, '')
        .replace(REGEX_PATTERNS.PHONE_FAX_LABELS, '')
        .replace(REGEX_PATTERNS.PHONE_NUMBERS, '')
        .replace(REGEX_PATTERNS.UK_POSTCODES, '')
        .replace(REGEX_PATTERNS.POSTAL_CODES, '')
        .replace(REGEX_PATTERNS.ISNI, ' ')
        .replace(REGEX_PATTERNS.GRID, ' ')
        .replace(REGEX_PATTERNS.RINGGOLD, ' ')
        .replace(REGEX_PATTERNS.IDENTIFIER_LABELS, ' ')
        .replace(REGEX_PATTERNS.COMPANY_DESIGNATIONS, '')

        .replace(/\b(and|And)\b(?=\s|,|$)/g, (match, p1, offset, string) => {  // Don't remove p1 though "'p1' is declared but its value is never read." message
            // Keep "and" if it is between two words (i.e., part of multi-word country or institution)
            const before = string.slice(0, offset).trim();
            const after = string.slice(offset + match.length).trim();
            if (/\w$/.test(before) && /^\w/.test(after)) {
                return match; // part of a phrase, keep it
            }
            return ''; // standalone "and", remove
        })

        .replace(REGEX_PATTERNS.PARENTHESES_ALL, '') // This removes all the content within parentheses including country names, which may be undesirable.

        .replace(REGEX_PATTERNS.DIACRITICS, '')

        .replace(REGEX_PATTERNS.QUOTES, "'")
        .replace(REGEX_PATTERNS.MULTIPLE_SPACES, ' ')
        .replace(/[.,;]+$/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    return result;
}



// ===============================================================
//                    SPECIAL CASE HANDLERS
// ===============================================================
// Special case handling needs improvement and expansion over time
// OR more algorithmic approaches should be developed.
// Unstandardized PubMed affiliations are a challenge for DirectMatch resolution.
// We decided to keep Step 1 (DirectMatch) to be precise by comprimising the algorithmic approach.


// Handles the Georgia ambiguity case (US state vs. country) using contextual clues from cities and institutions
function handleGeorgiaSpecialCase(country, source, segment) {
    if (country !== SPECIAL_CASES.GEORGIA || source !== RESOLUTION_SOURCES.DIRECT_MATCH) {
        return { country, source };
    }

    const lastWord = segment.trim().split(/\s+/).pop().replace(/[.,;]$/, '').toUpperCase();

    // Check for explicit USA indicator
    if (lastWord === 'USA' || lastWord === 'U.S.A') {
        return { country: SPECIAL_CASES.UNITED_STATES, source: RESOLUTION_SOURCES.ALPHA3 };
    }

    // Check for US cities
    if (includesInPreviousSegments(segment, GEORGIA_CITIES.US[0], 1) ||
        includesInPreviousSegments(segment, GEORGIA_CITIES.US[1], 1) ||
        includesInPreviousSegments(segment, GEORGIA_CITIES.US[2], 1) ) {
        return { country: SPECIAL_CASES.UNITED_STATES, source: RESOLUTION_SOURCES.US_STATE_NAME };
    }

    // Check for Georgian capital
    if (includesInPreviousSegments(segment, GEORGIA_CITIES.COUNTRY[0], 1) ||
        includesInPreviousSegments(segment, GEORGIA_CITIES.COUNTRY[1], 1) ||
        includesInPreviousSegments(segment, GEORGIA_CITIES.COUNTRY[2], 1) ||
        includesInPreviousSegments(segment, GEORGIA_CITIES.COUNTRY[3], 1)) {
        return { country: SPECIAL_CASES.GEORGIA, source: RESOLUTION_SOURCES.DIRECT_MATCH };
    }

    // Flag for city-based verification
    return { country: SPECIAL_CASES.US_GEORGIA, source: RESOLUTION_SOURCES.US_GEORGIA_CHECK };
}

// Resolves Georgia ambiguity using city lookup from Institution database
function resolveGeorgiaWithCity(country, source, segmentArray, cityToCountryMap, countryList) {
    if (source !== RESOLUTION_SOURCES.US_GEORGIA_CHECK || !cityToCountryMap) {
        return { country, source };
    }

    const citySegment = segmentArray.length > 1 ? segmentArray[segmentArray.length - 2] : '';
    if (!citySegment) {
        return { country, source };
    }

    const normalized = citySegment
        .toLowerCase()
        .replace(/[.,;()]/g, '')
        .replace(REGEX_PATTERNS.MULTIPLE_WHITESPACE, ' ')
        .trim();

    const cityMatches = cityToCountryMap.get(normalized);
    if (!cityMatches) {
        return { country, source };
    }

    const cityResult = handleCityMatches(cityMatches, normalized);

    // Override with city result if it's definitive
    if (cityResult.country === SPECIAL_CASES.UNITED_STATES ||
        cityResult.country === SPECIAL_CASES.GEORGIA) {
        return { country: cityResult.country, source: cityResult.source };
    }

    return { country, source };
}

// Handles Mexico/New Mexico disambiguation

function handleMexicoSpecialCase(country, source, lastSegment) {
    // PMID 39508172 University of New Mexico Health Science Center Albuquerque NM. → United States (USStateName)
    // Since the whole string is a single segment, last segment check is the whole string check
    // leading to New Mexico to be resolved to US though it is not as the state name, but institution name
    if (country === SPECIAL_CASES.MEXICO &&
        source === RESOLUTION_SOURCES.DIRECT_MATCH &&
        lastSegment.toLowerCase().includes(SPECIAL_CASES.NEW_MEXICO)) {
        return { country: SPECIAL_CASES.UNITED_STATES, source: RESOLUTION_SOURCES.US_STATE_NAME };
    }
    return { country, source };
}

function handleIrelandSpecialCase(country, source, lastSegment) {
    if (country === SPECIAL_CASES.IRELAND &&
        source === RESOLUTION_SOURCES.DIRECT_MATCH &&
        lastSegment.toLowerCase().includes('northern ireland')) {
        return { country: SPECIAL_CASES.UK, source: RESOLUTION_SOURCES.DIRECT_MATCH };
    }
    return { country, source };
}

// Handles Samoa/American Samoa disambiguation
function handleSamoaSpecialCase(country, source, lastSegment) {
    if (country === SPECIAL_CASES.SAMOA &&
        source === RESOLUTION_SOURCES.DIRECT_MATCH &&
        lastSegment.toLowerCase().includes('american samoa')) {
        return { country: SPECIAL_CASES.AMERICAN_SAMOA, source: RESOLUTION_SOURCES.DIRECT_MATCH };
    }
    return { country, source };
}

// Handles Republic of Korea/DPRK disambiguation
function handleKoreaSpecialCase(country, source, lastSegment) {
    if (source !== RESOLUTION_SOURCES.DIRECT_MATCH) {
        return { country, source };
    }

    const text = lastSegment.toLowerCase();

    const koreaAliases = [
        {
            alias: "democratic people's republic of korea",
            country: SPECIAL_CASES.DPRK
        },
        {
            alias: "democratic republic of korea",
            country: SPECIAL_CASES.DPRK
        },
        {
            alias: "north korea",
            country: SPECIAL_CASES.DPRK
        },
        {
            alias: "republic of korea",
            country: SPECIAL_CASES.REPUBLIC_OF_KOREA
        },
        {
            alias: "south korea",
            country: SPECIAL_CASES.REPUBLIC_OF_KOREA
        },
        {
            alias: "korea",
            country: SPECIAL_CASES.REPUBLIC_OF_KOREA
        }
    ];

    // length-priority matching
    koreaAliases.sort((a, b) => b.alias.length - a.alias.length);

    for (const { alias, country: resolved } of koreaAliases) {
        if (text.includes(alias)) {
            return { country: resolved, source };
        }
    }

    return { country, source };
}



// Handles China/Taiwan disambiguation
function handleChinaSpecialCase(country, source, lastSegment) {
    if (country !== SPECIAL_CASES.CHINA || source !== RESOLUTION_SOURCES.DIRECT_MATCH) {
        return { country, source };
    }

    const lastSegmentLower = lastSegment.toLowerCase();
    if (lastSegmentLower.includes(SPECIAL_CASES.PRC)) {
        return { country: SPECIAL_CASES.CHINA, source: RESOLUTION_SOURCES.DIRECT_MATCH };
    } else if (lastSegmentLower.includes(SPECIAL_CASES.ROC)) {
        return { country: SPECIAL_CASES.TAIWAN, source: RESOLUTION_SOURCES.DIRECT_MATCH };
    }
    return { country, source };
}

// Handles Republic of the Congo/Democratic Republic of the Congo disambiguation
function handleCongoSpecialCase(country, source, lastSegment) {
    if (source !== RESOLUTION_SOURCES.DIRECT_MATCH) {
        return { country, source };
    }

    const text = lastSegment.toLowerCase();

    const congoAliases = [
        {
            alias: "democratic republic of the congo",
            country: SPECIAL_CASES.DRC
        },
        {
            alias: "democratic republic of congo",
            country: SPECIAL_CASES.DRC
        },
        {
            alias: "dr congo",
            country: SPECIAL_CASES.DRC
        },
        {
            alias: "congo-kinshasa",
            country: SPECIAL_CASES.DRC
        },
        {
            alias: "republic of the congo",
            country: SPECIAL_CASES.RC
        },
        {
            alias: "republic of congo",
            country: SPECIAL_CASES.RC
        },
        {
            alias: "congo-brazzaville",
            country: SPECIAL_CASES.RC
        },
        {
            alias: "congo",
            country: SPECIAL_CASES.RC
        }
    ];

    // length-priority matching
    congoAliases.sort((a, b) => b.alias.length - a.alias.length);

    for (const { alias, country: resolved } of congoAliases) {
        if (text.includes(alias)) {
            return { country: resolved, source };
        }
    }

    return { country, source };
}


// Applies all special case handlers in sequence
function applyAllSpecialCases(country, source, segment, lastSegment, cityToCountryMap, institutionLookup, countryList) {
    const segmentArray = segment.split(DELIMITERS.COMMA).map(c => c.trim()).filter(Boolean);

    // Georgia special case
    let result = handleGeorgiaSpecialCase(country, source, segment);
    country = result.country;
    source = result.source;

    // Resolve Georgia with city if flagged
    result = resolveGeorgiaWithCity(country, source, segmentArray, cityToCountryMap, countryList);
    country = result.country;
    source = result.source;

        // Mexico/New Mexico
        result = handleMexicoSpecialCase(country, source, lastSegment);
        country = result.country;
        source = result.source;

        // Ireland/Northern Ireland
        result = handleIrelandSpecialCase(country, source, lastSegment);
        country = result.country;
        source = result.source;

        // Samoa/American Samoa
        result = handleSamoaSpecialCase(country, source, lastSegment);
        country = result.country;
        source = result.source;

        // Korea variants
        result = handleKoreaSpecialCase(country, source, lastSegment);
        country = result.country;
        source = result.source;

        // China/Taiwan
        result = handleChinaSpecialCase(country, source, lastSegment);
        country = result.country;
        source = result.source;

        // Congo variants
        result = handleCongoSpecialCase(country, source, lastSegment);
        country = result.country;
        source = result.source;

    return { country, source };
}

// ===============================================================
//                    UTILITY FUNCTIONS
// ===============================================================

// Checks if a specific phrase appears in the previous N comma-separated segments of the affiliation string (used for disambiguation)
// Limit defaults to LIMIT.DISAMBIGUATION_SEGMENT_LIMIT in config.js (currenly 2)
function includesInPreviousSegments(segment, phrase, segmentLimit = LIMIT.DISAMBIGUATION_SEGMENT_LIMIT) {
    const segmentArray = segment.split(DELIMITERS.COMMA).map(c => c.trim()).filter(Boolean);
    const contextSegments = segmentArray.slice(-segmentLimit - 1, -1);
    const contextText = contextSegments.join(' ').toLowerCase();
    return contextText.includes(phrase.toLowerCase());
}

// Escapes special regex characters in a string to allow safe use in regular expressions
// Used in direct match checking
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Converts a string to title case (first letter of each word capitalized)
// Used in US state name checking
function capitalizeTitle(str) {
    return str
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Processes city matches from the Institution database: returns clear country if city is unique to one country, or flags confusion if city exists in multiple countries
function handleCityMatches(cityMatches, cityName) {
    const uniqueCountries = [...new Set(cityMatches.map(m => m.country))];

    if (uniqueCountries.length === 1) {
        const formattedCityName = cityName.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        return {
            country: uniqueCountries[0],
            source: `${formattedCityName} - ${RESOLUTION_SOURCES.INSTITUTION_CITY}`
        };
    } else {
        return {
            country: cityName.toUpperCase(),
            source: RESOLUTION_SOURCES.INSTITUTION_CITY_CONFUSION
        };
    }
}


// ===============================================================
//                    RESOLUTION STEP FUNCTIONS
// ===============================================================

// Step 1 & 2: Attempts to identify a country by checking the last segment of the text for direct matches or alpha-3 country codes
function findCountryAtEnd(text, countryList) {
    const cleanedText = text.trim();
    const segmentArray = cleanedText.split(DELIMITERS.COMMA).map(c => c.trim()).filter(Boolean);
    const lastSegment = segmentArray.length > 0 ? segmentArray[segmentArray.length - 1] : '';
    const cleanedSegment = lastSegment.replace(/[.,;:]$/, '');

    // Check DirectMatch first (most explicit)
    const directMatchResult = checkDirectMatch(cleanedSegment, countryList);
    if (directMatchResult) {
        // Special case: If DirectMatch found "United States" but segment is exactly "U.S.A",
        // override to alpha3 source for proper attribution
        if (directMatchResult.country === SPECIAL_CASES.UNITED_STATES &&
            cleanedSegment.toUpperCase().match(/\bUSA\b$/)) {
            return { country: SPECIAL_CASES.UNITED_STATES, source: RESOLUTION_SOURCES.ALPHA3 };
        }
        return directMatchResult;
    }

    // Check alpha3 codes as fallback
    const alpha3Result = checkAlpha3Code(cleanedSegment, countryList);
    if (alpha3Result) return alpha3Result;

    return null;
}

// Checks if the last segment contains an exact match to a country name or its aliases from the country list
// Country name at the end of the last segment only
// The Dartmouth Institute for Health Policy and Clinical Practice Lebanon NH USA. will not return Lebanon
function checkDirectMatch(segment, countryList) {
    if (!segment) return null;

    const segments = segment.split(DELIMITERS.COMMA);
    const lastSegment = segments[segments.length - 1];
    const normLastSegment = standardizeAffiliationText(lastSegment.toLowerCase());

    for (const countryEntry of countryList) {
        const patterns = [countryEntry.name, ...(countryEntry.aliases || [])].filter(Boolean);

        for (const pattern of patterns) {
            const normPattern = standardizeAffiliationText(pattern.toLowerCase());
            const regex = new RegExp(`\\b${escapeRegex(normPattern)}\\b\\s*$`);

            if (regex.test(normLastSegment)) {
                return {
                    country: countryEntry.name,
                    source: RESOLUTION_SOURCES.DIRECT_MATCH
                };
            }
        }
    }

    return null;
}


// Checks if the segment ends with a valid ISO 3166 alpha-3 country code (e.g., USA, GBR, JPN)
function checkAlpha3Code(segment, countryList) {
    for (const countryEntry of countryList) {
            // Match alpha-3 code that is ALL-CAPS and a standalone word
            // Department of Cardiovascular and Thoracic Surgery, Franciscan St Francis Health, Indianapolis, Ind. → IND (UNRESOLVED)
        if (countryEntry.alpha3) {
            const alpha3Regex = new RegExp(`\\b${countryEntry.alpha3}\\b[.,;:]?$`);
            if (alpha3Regex.test(segment)) {
                return { country: countryEntry.name, source: RESOLUTION_SOURCES.ALPHA3 };
            }
        }
    }
    return null;
}



// Step 3: Identifies United States by detecting full US state names in the last segment
function inferUSFromStateName(text) {
    // Patterns that indicate institutional names, not locations
    const institutionPatterns = [
        // "X of State" patterns - allow multiple words after "of"
        /\bUniversity\s+of\s+.+$/i,
        /\bCollege\s+of\s+.+$/i,
        /\bInstitute\s+of\s+.+$/i,
        /\bSchool\s+of\s+.+$/i,
        /\bAcademy\s+of\s+.+$/i,

        // "State X" patterns
        /\b\w+\s+University$/i,
        /\b\w+\s+College$/i,
        /\b\w+\s+Institute$/i,
        /\b\w+\s+School$/i,
        /\b\w+\s+Academy$/i,

        // "State X University/College" patterns
        /\b.+\s+State\s+University$/i,
        /\b.+\s+State\s+College$/i,

        // Medical/Hospital patterns
        /\b.+\s+Medical\s+Center$/i,
        /\b.+\s+Hospital$/i,
        /\b.+\s+Health\s+System$/i,
        /\bMedical\s+Center\s+of\s+.+$/i,

        // Tech/Research patterns
        /\b.+\s+Institute\s+of\s+Technology$/i,
        /\b.+\s+Research\s+Institute$/i
    ];

    // Helper function to check if a segment is a US state
    function checkStateMatch(segment) {
        const normalized = segment.toLowerCase().trim();

        // Hard-code District of Columbia check first
        if ((normalized === 'district of columbia') || (normalized === 'both in district of columbia') || (normalized === 'all in district of columbia')) {
            return true;
        }

        const words = segment.split(/\s+/).map(w => w.replace(/[.,;]/g, '').trim()).filter(Boolean);
        if (words.length === 0) return false;

        // Try 3-word states (for any future additions)
        if (words.length >= 3) {
            const lastThree = `${words[words.length - 3]} ${words[words.length - 2]} ${words[words.length - 1]}`;
            if (US_STATES.has(capitalizeTitle(lastThree))) return true;
        }

        // Try 2-word states (e.g., "North Carolina", "New Mexico")
        if (words.length >= 2) {
            const lastTwo = `${words[words.length - 2]} ${words[words.length - 1]}`;
            if (US_STATES.has(capitalizeTitle(lastTwo))) return true;
        }

        // Try 1-word states (e.g., "California", "Texas")
        const lastOne = words[words.length - 1];
        if (US_STATES.has(capitalizeTitle(lastOne))) return true;


        return false;
    }

    // First, check for "- both in ..." or "- all in ..." pattern
    const specialMatch = text.match(/- (both|all)\s+in\s+(.+)$/i);
    if (specialMatch) {
        const stateSegment = specialMatch[2].trim();

        // Check if it's a state FIRST
        if (checkStateMatch(stateSegment)) {
            return SPECIAL_CASES.UNITED_STATES;
        }

        // Only check institution patterns if it's not a state
        if (institutionPatterns.some(pattern => pattern.test(stateSegment))) {
            return null;
        }

        return null;
    }

    // If no "- both/all in ..." pattern, check the last segment after comma
    const segments = text.split(DELIMITERS.COMMA).map(s => s.trim()).filter(Boolean);
    if (segments.length === 0) return null;

    const lastSegment = segments[segments.length - 1];

    // Check if it's a state FIRST
    if (checkStateMatch(lastSegment)) {
        return SPECIAL_CASES.UNITED_STATES;
    }

    // Only check institution patterns if it's not a state
    if (institutionPatterns.some(pattern => pattern.test(lastSegment))) {
        return null;
    }

    return null;
}

// Step 4: Identifies United States by detecting all-caps US state abbreviations

function inferUSFromStateAbbreviation(text) {
    console.log('DEBUG Step 4 input text:', text);
    if (!text) return null;

    const segments = text.split(DELIMITERS.COMMA);
    const lastSegment = segments[segments.length - 1];

    let cleaned = lastSegment.replace(/[.,;]/g, '').trim();
    const words = cleaned.split(/\s+/);

    if (words.length === 0) return null;

    const lastWord = words[words.length - 1];

    // EXACTLY 2-letter ALL-CAPS token
    if (!/^[A-Z]{2}$/.test(lastWord)) return null;

    const upper = lastWord;
    const prevWord = words[words.length - 2];

    const CONJUNCTIONS = new Set(['and', 'or', 'And', 'Or']);
    if (prevWord && CONJUNCTIONS.has(prevWord)) return null;


    if (US_STATE_ABBREVIATIONS.has(upper)) {
        return SPECIAL_CASES.UNITED_STATES;
    }

    return null;
}



// Step 5: Resolves country by matching institution names against the Institution database using a 3-pass approach: exact piece match, combined segments, and full affiliation match, with city-based disambiguation for multiple matches
function inferCountryFromInstitution(affil, lookupMap) {
    if (!lookupMap) return null;

    const affilLower = affil.toLowerCase().trim();
    const affilLowerNoPunct = affilLower.replace(/[.,;]/g, ' ');
    let matches = [];
    let matchedKey = null;
    let confusionResult = null;

    // Pass 1: Try exact match on individual pieces
    const pieces = affil.split(DELIMITERS.COMMA).map(p => p.trim().toLowerCase());
    for (let i = pieces.length - 1; i >= 0; i--) {
        const institutions = lookupMap.get(pieces[i]);
        if (institutions) {
            // Filter to only institutions where pieces[i] is an EXACT match to name OR alias
            const exactMatches = institutions.filter(inst => {
                const nameLower = inst.name.toLowerCase().trim();
                const aliasesLower = (inst.aliases || []).map(a => a.toLowerCase().trim());
                return nameLower === pieces[i] || aliasesLower.includes(pieces[i]);
            });

            if (exactMatches.length > 0) {
                matches.push(...exactMatches);
                matchedKey = pieces[i];
                break;
            }
        }
    }

    // Try to disambiguate Pass 1 matches
    if (matches.length > 0) {
        const result = disambiguateInstitutionMatches(matches, matchedKey, affilLowerNoPunct);
        if (result.resolved) {
            return result;
        }
        confusionResult = result;
    }

    // Pass 2: Try combining last N comma-separated segments (N=2,1), currently set to 2, not checking until the third last segment
    // This will catch cases like "University of California, Berkeley"
    // However, this misses cases like "University of California Berkeley" since the name without comma is not in the institution database
    matches = [];
    matchedKey = null;

    const commaSegments = affil
        .split(DELIMITERS.COMMA)
        .map(c => c.trim().toLowerCase())
        .filter(Boolean);

    if (commaSegments.length >= 1) {
        // 2a. Try last N segments joined (e.g., University of California, Berkeley)
        for (let n = Math.min(2, commaSegments.length); n >= 1; n--) {
            const slice = commaSegments.slice(-n).join(', ');
            const institutions = lookupMap.get(slice);
            if (institutions) {
                matches.push(...institutions);
                matchedKey = slice;
                break;
            }
        }

        // 2b. Fallback: if still nothing, try the second-last segment alone
        // In case of ambiguity, this step ensures that the second-last segment is considered as a potential match
        if (matches.length === 0 && commaSegments.length >= 2) {
            const fallbackKey = commaSegments[commaSegments.length - 2];
            const institutions = lookupMap.get(fallbackKey);
            if (institutions) {
                matches.push(...institutions);
                matchedKey = fallbackKey;
            }
        }
    }

    // Try to disambiguate Pass 2 matches
    if (matches.length > 0) {
        const result = disambiguateInstitutionMatches(matches, matchedKey, affilLowerNoPunct);
        if (result.resolved) {
            return result;
        }
        confusionResult = result;
    }

    // Pass 3: Exact match on full affiliation (preserve commas)
    // This will catch the whole affiliation string if it's a direct match in the institution database
    // However, our random check shows that there is no such case where the affiliation string with more than two commas (i.e, more than 2 sgements) matches the institution name in the database.
    const fullMatch = lookupMap.get(affilLower);
    if (fullMatch) {
        const result = disambiguateInstitutionMatches(fullMatch, affilLower, affilLowerNoPunct);
        if (result.resolved) {
            return result;
        }
        confusionResult = result;
    }

    return confusionResult || null;
}

// Disambiguates multiple institution matches by city context
function disambiguateInstitutionMatches(matches, matchedKey, affilLowerNoPunct) {
    if (matches.length === 1) {
        return {
            resolved: true,
            country: matches[0].country,
            source: matches[0].name + ' - ' + RESOLUTION_SOURCES.INSTITUTION_NAME
        };
    }

    // Check if all matches are in the same country
    const uniqueCountries = [...new Set(matches.map(m => m.country))];
    if (uniqueCountries.length === 1) {
        return {
            resolved: true,
            country: uniqueCountries[0],
            source: matches[0].name + ' - ' + RESOLUTION_SOURCES.INSTITUTION_NAME
        };
    }

    // Try to disambiguate by city
    // If the institution name is in more than one country, and check the city context to resolve the ambiguity.
    for (const inst of matches) {
        if (inst.city && affilLowerNoPunct.includes(inst.city.toLowerCase())) {
            return {
                resolved: true,
                country: inst.country,
                source: inst.name + ' - ' + RESOLUTION_SOURCES.INSTITUTION_NAME
            };
        }
    }

    // Cannot disambiguate - return confusion
    // The institution name is in more than one country, and no city context is available to resolve the ambiguity.
    return {
        resolved: false,
        confusion: true,
        institutionName: matchedKey
    };
}
// Step 5.5: Similar to inferCountryFromCity but used specifically when institution names don't match city names, providing an additional verification layer
// PMID - 29036613 - Department of Radiation Oncology, National Cancer Center Hospital, Tokyo → Japan (Tokyo – InstitutionCity)
//   Institution Dataset contains only one “National Cancer Center Hospital,” located in South Korea, and no corresponding institution in Japan.
//   If this step were not included, the country would be incorrectly resolved to South Korea (Republic of Korea) based on institution name alone.

function forcedInferCountryFromCity(lastSegment, cityToCountryMap) {
    if (!lastSegment || !cityToCountryMap) return null;

    const normalized = lastSegment
        .toLowerCase()
        .replace(/[.,;()]/g, '')
        .replace(REGEX_PATTERNS.MULTIPLE_WHITESPACE, ' ')
        .trim();

    const cityMatches = cityToCountryMap.get(normalized);
    if (!cityMatches) return null;

    console.log(
        `[InstitutionCity] Forced matched city: "${normalized}" →`,
        forcedHandleCityMatches(cityMatches, normalized)
    );

    return forcedHandleCityMatches(cityMatches, normalized);
}


// Processes city matches for the forced city check: returns country only if the city uniquely belongs to one country, otherwise returns null
// Used in forcedInferCountryFromCity above
function forcedHandleCityMatches(cityMatches, cityName) {
    const uniqueCountries = [...new Set(cityMatches.map(m => m.country))];

    if (uniqueCountries.length === 1) {
        const formattedCityName = cityName.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        return {
            country: uniqueCountries[0],
            source: `${formattedCityName} - ${RESOLUTION_SOURCES.INSTITUTION_CITY}`
        };
    }

    return null;
}



// Step 6: Attempts to resolve country by matching city names against cityToCountryMap
// Now uses segment-based approach like inferCountryFromInstitution
function inferCountryFromCity(lastSegment, secondLastSegment, cityToCountryMap) {
    if (!cityToCountryMap) return null;

    // Helper function to normalize and lookup a segment
    function checkSegmentForCity(segment) {
        if (!segment) return null;

        const normalized = segment
            .toLowerCase()
            .replace(/[.,;()]/g, '')
            .replace(REGEX_PATTERNS.MULTIPLE_WHITESPACE, ' ')
            .trim();

        // Direct lookup in cityToCountryMap
        const cityMatches = cityToCountryMap.get(normalized);
        if (cityMatches) {
            console.log(`[InstitutionCity] Matched city: "${normalized}" →`, handleCityMatches(cityMatches, normalized));
            return handleCityMatches(cityMatches, normalized);
        }

        return null;
    }

    // Try last segment first (most common case)
    const lastResult = checkSegmentForCity(lastSegment);
    if (lastResult) return lastResult;

    // Fallback to second-last segment
    const secondLastResult = checkSegmentForCity(secondLastSegment);
    if (secondLastResult) return secondLastResult;

    return null;
}


// ===============================================================
//                    STANDARDIZATION HELPERS
// ===============================================================

// Standardizes a country name to its canonical form using the country list
// E.g., "South Korea" → "Republic of Korea"
function standardizeCountryName(country, countryList) {
    if (!country) return country;

    for (const countryEntry of countryList) {
        if (countryEntry.name === country ||
            (countryEntry.aliases && countryEntry.aliases.includes(country))) {
            return countryEntry.name;
        }
    }
    return country;
}


// Checks if the affiliation appears to be a contribution note rather than a geographic affiliation
// The reference is in config.js and needs to be updated as new keywords are identified
function isContributionNote(affil) {
    const parts = affil.split(DELIMITERS.COMMA).map(p => p.trim()).filter(p => p.length > 0);
    if (parts.length === 0) return false;

    const lastPart = parts[parts.length - 1].trim();
    const contributionNoteRegex = new RegExp(`\\b(${CONTRIBUTION_KEYWORDS.join('|')})\\b`, 'i');

    return contributionNoteRegex.test(lastPart);
}

// Creates a fallback unresolved country entry from the last part of the affiliation
function createUnresolvedEntry(affil) {
    const parts = affil.split(DELIMITERS.COMMA).map(p => p.trim()).filter(p => p.length > 0);
    if (parts.length === 0) return null;

    const lastPart = parts[parts.length - 1].trim();
    const fallbackCountry = lastPart
        .replace(REGEX_PATTERNS.MULTIPLE_WHITESPACE, ' ')
        .trim()
        .toUpperCase();

    return { country: fallbackCountry, source: RESOLUTION_SOURCES.UNRESOLVED };
}


// ===============================================================
//                    MAIN RESOLUTION FUNCTION
// ===============================================================

// Main function that resolves country names from PubMed affiliation strings using a 6-step hierarchical approach: direct match, alpha-3 codes, US state names, US state abbreviations, institution lookup, and city lookup
export function resolveCountry(affil, countryList, institutionLookup, cityToCountryMap = null) {
    // Normalize and clean the affiliation string
    affil = standardizeAffiliationText(affil);
    affil = stripNonAffiliationContent(affil);

    // Split into segments and process each
    const segments = affil.split(DELIMITERS.SEMICOLON);
    const countryEntries = [];

    for (const segment of segments) {
        // Extract last segment for special case handling
        const segmentArray = segment.split(DELIMITERS.COMMA).map(c => c.trim()).filter(Boolean);
        const lastSegment = segmentArray.length > 0 ? segmentArray[segmentArray.length - 1] : '';
        const secondLastSegment = segmentArray.length > 1 ? segmentArray[segmentArray.length - 2] : '';

        // ========================================
        // Step 1 & 2: DirectMatch and alpha3
        // ========================================
        let countryInfo = findCountryAtEnd(segment, countryList);
        let country = countryInfo?.country ?? null;
        let source = countryInfo?.source ?? '';

        // ========================================
        // Apply Special Cases
        // ========================================
        const specialResult = applyAllSpecialCases(
            country,
            source,
            segment,
            lastSegment,
            cityToCountryMap,
            institutionLookup,
            countryList
        );
        country = specialResult.country;
        source = specialResult.source;

        // ========================================
        // Step 3: US State Name Check
        // ========================================
        if (!country) {
            const usCountry = inferUSFromStateName(segment);
            if (usCountry) {
                country = usCountry;
                source = RESOLUTION_SOURCES.US_STATE_NAME;
            }
        }

        // ========================================
        // Step 4: US State Abbreviation Check
        // ========================================
        if (!country) {
            const usCountry = inferUSFromStateAbbreviation(segment);
            if (usCountry) {
                country = usCountry;
                source = RESOLUTION_SOURCES.US_STATE_ABBR;
            }
        }

        // ========================================
        // Step 5: Institution Lookup
        // ========================================
        if (!country) {
            const instResult = inferCountryFromInstitution(segment, institutionLookup);

            if (instResult) {
                if (instResult.resolved) {
                    country = standardizeCountryName(instResult.country, countryList);
                    source = instResult.source;
                } else if (instResult.confusion) {
                    country = instResult.institutionName.toUpperCase();
                    source = RESOLUTION_SOURCES.INSTITUTION_CONFUSION;
                }
            }
        }

        // Handle Georgia flag from lookup
        if (country === SPECIAL_CASES.US_GEORGIA &&
            source === RESOLUTION_SOURCES.US_GEORGIA_CHECK &&
            institutionLookup) {
            const institutionResult = inferCountryFromInstitution(segment, institutionLookup);
            if (institutionResult) {
                if (institutionResult.resolved) {
                    country = institutionResult.country;
                    source = RESOLUTION_SOURCES.INSTITUTION_NAME;
                } else if (institutionResult.confusion) {
                    country = institutionResult.institutionName.toUpperCase();
                    source = RESOLUTION_SOURCES.INSTITUTION_CONFUSION;
                }
            }
        }

        // ===========================================
        // Step 5.5: Institution-City Double-Check
        // ===========================================
        if (country && source.includes(RESOLUTION_SOURCES.INSTITUTION_NAME) && cityToCountryMap) {
            const cityResult = forcedInferCountryFromCity(lastSegment, cityToCountryMap);
            if (cityResult && cityResult.country !== country) {
                country = standardizeCountryName(cityResult.country, countryList);
                source = cityResult.source;
            }
        }

        // ========================================
        // Step 6: City Check
        // ========================================
        if (source === RESOLUTION_SOURCES.INSTITUTION_CONFUSION) {
            const cityResult = inferCountryFromCity(lastSegment, secondLastSegment,cityToCountryMap);
            if (cityResult) {
                country = standardizeCountryName(cityResult.country, countryList);
                source = cityResult.source;
            }
        }

        if (!country && cityToCountryMap) {
            const cityResult = inferCountryFromCity(lastSegment, secondLastSegment, cityToCountryMap);
            if (cityResult) {
                country = standardizeCountryName(cityResult.country, countryList);
                source = cityResult.source;
            }
        }


        // Ontario disambiguation
        // This needs more algorithmic development instead of hardcoding known cities
        if (
            segmentArray && segmentArray.length >= 2 &&
            standardizeAffiliationText(lastSegment).toLowerCase().replace(/[.,;()]/g, '').trim() === 'ontario'
        ) {
            const secondLast = standardizeAffiliationText(segmentArray[segmentArray.length - 2])
                .toLowerCase()
                .replace(/[.,;()]/g, '')
                .trim();

            // Use ONTARIO_CITIES array for comparison
            if (ONTARIO_CITIES.includes(secondLast)) {
                // Special case: Toronto, Ottawa, Waterloo, or Brampton, Ontario → Canada
                country = 'Canada';
                source = RESOLUTION_SOURCES.INSTITUTION_CITY;
            } else {
                // For all other cases ending with Ontario (not preceded by known Canada, Ontario cities)
                country = 'ONTARIO'; // uppercase
                source = RESOLUTION_SOURCES.INSTITUTION_CITY_CONFUSION;
            }
        }

        // Vic disambiguation
        // This needs more algorithmic development instead of hardcoding known cities
        if (
            segmentArray && segmentArray.length >= 2 &&
            standardizeAffiliationText(lastSegment).toLowerCase().replace(/[.,;()]/g, '').trim() === 'vic'
        ) {
            const secondLast = standardizeAffiliationText(segmentArray[segmentArray.length - 2])
                .toLowerCase()
                .replace(/[.,;()]/g, '')
                .trim();

            if (secondLast === 'melbourne') {
                // Special case: melbourne, vic → Australia
                country = 'Australia';
                source = RESOLUTION_SOURCES.INSTITUTION_CITY;
            } else {
                // For all other cases ending with Ontario (not preceded by Toronto)
                country = 'VIC'; // uppercase
                source = RESOLUTION_SOURCES.INSTITUTION_CITY_CONFUSION;
            }
        }


        // Add resolved country to results
        if (country) {
            countryEntries.push({ country, source });
        }
    }


    if (countryEntries.length > 0) {
        return countryEntries;
    }

    // ========================================
    // Handle No Resolution Cases
    // ========================================

    const trimmedAffil = affil.trim();

    // Empty string after cleaning
    if (trimmedAffil === '') {
        return [{ country: '', source: RESOLUTION_SOURCES.FILTERED_STRING }];
    }

    // Check for contribution notes
    if (isContributionNote(affil)) {
        return [{ country: '', source: RESOLUTION_SOURCES.CONTRIBUTION_NOTE }];
    }

    // Create unresolved entry
    const unresolvedEntry = createUnresolvedEntry(affil);
    return unresolvedEntry ? [unresolvedEntry] : null;
}