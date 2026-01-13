// ===============================================================
//                   CONFIGURATION MODULE
// ===============================================================

// config.js
export const LIMIT = {
  DISAMBIGUATION_SEGMENT_LIMIT: 2,
};

export const DELIMITERS = {
  SEMICOLON: ";",
  COMMA: ",",
};

export const REGEX_PATTERNS = {
  ORCID_ROR_ISNI:
    /\b(https?:\/\/)?(orcid\.org|ror\.org|isni\.org)\/\S+\.?\s*/gi,
  CORRESPONDING_AUTHOR_NAME:
  /\bCorresponding author[:\-]?\s*[^,;]*(?=,|\bEmail\b|$)\s*,?\s*/gi,
  EMAIL_LABELS:
    /(Electronic\s+address|Email|E[-\s]?mail|Correspondence|Corresponding author\'s email|Corresponding author)[:\-]?\s*/gi,
  PHONE_FAX_LABELS: /\b(Phone|Tel|Telephone|Fax|Mobile|Cell)[:\-]?\s*/gi,
  EMAIL_ADDRESSES: /\b\S+@\S+\.\S+\b[.,;]?\s*/gi,
  PHONE_NUMBERS: /(\+?\d[\d\s\-\/().]*)/g,
  UK_POSTCODES: /\b([A-Z]{1,2}\d{1,2}[A-Z]?)\s?(\d[A-Z]{2})\b/gi,
  POSTAL_CODES: /[,.\s]*(\d{3,}(-\d{3,})?|[A-Z]\d[A-Z]\s?\d[A-Z]\d)?\.?\s*$/gi,
  ISNI: /[.,;\s]*ISNI:\s*\d[\d\s]*\.?\s*/gi,
  GRID: /[.,;\s]*GRID:\s*grid\.[\w.\-]*\.?\s*/gi,
  RINGGOLD:
    /[.,;\s]*RINGGOLD(?:\s*ID|\s*Identifier|\s*Organization\s*ID)?[:\s]*\d+\.?\s*/gi,
  IDENTIFIER_LABELS: /\b(ROR|ORCID|ISNI|GRID|RINGGOLD)\b[:\s]*/gi,
  COMPANY_DESIGNATIONS:
    /,\s*\b(CO\.?\s*(LTD|LIMITED)|Co\.?\s*(Ltd\.?|Limited)|Inc\.?|Corp\.?|LLC|PLC|GmbH|S\.?A\.?|P\.?T\.?Y\.?\s*LTD|PTY|LTD\.?|LIMITED)\b(?=\s*,|$)/gi,
  LOWERCASE_AND: /\b(And|and)\.?\b/g,
  PARENTHESES_ALL: /\([^()]*\)/g,

  MULTIPLE_SPACES: /\s{2,}/g,
  MULTIPLE_WHITESPACE: /\s+/g,

  DIACRITICS: /[\u0300-\u036f]/g,
  USA_VARIATIONS: /\bu[\.\-\s]*s[\.\-\s]*a\.?\b/gi,
  UK_VARIATIONS: /\bu[\.\-\s]*k\.?\b/gi,
  QUOTES: /[''´`]/g,
};

export const RESOLUTION_SOURCES = {
  DIRECT_MATCH: "DirectMatch",
  ALPHA3: "alpha3",
  US_STATE_NAME: "USStateName",
  US_STATE_ABBR: "USStateAbbr",
  INSTITUTION_NAME: "InstitutionName",
  INSTITUTION_CITY: "InstitutionCity",
  US_GEORGIA_CHECK: "USGeorgiaToCheck",
  INSTITUTION_CONFUSION: "InstitutionNameConfusion",
  INSTITUTION_CITY_CONFUSION: "InstitutionCityConfusion",
  UNRESOLVED: "UNRESOLVED",
  CONTRIBUTION_NOTE: "ContributionNote",
  FILTERED_STRING: "FilteredString",

};

export const SPECIAL_CASES = {
  GEORGIA: "Georgia", US_GEORGIA: "US-Georgia",
  UNITED_STATES: "United States", MEXICO: "Mexico",
  NEW_MEXICO: "new mexico",
  SAMOA: "Samoa", AMERICAN_SAMOA: "American Samoa",
  REPUBLIC_OF_KOREA: "Republic of Korea", DPRK: "Democratic People's Republic of Korea",
  CHINA: "China", TAIWAN: "Taiwan",
  PRC: "people's republic of china", ROC: "republic of china",
  RC: "Congo (Congo-Brazzaville)", DRC: "Congo (Congo-Kinshasa)",
  IRELAND: "Ireland", NORTHERN_IRELAND: "Northern Ireland", UK: "United Kingdom",
};

export const ONTARIO_CITIES = [
  // Developers can add more cities if needed
  "toronto",
  "ottawa",
  "waterloo",
  "brampton",
  // "Hamilton" To add in future version
];

export const GEORGIA_CITIES = {
  // Developers can add more cities if needed
  US: ["atlanta", "athens", "augusta"],
  COUNTRY: ["tbilisi", "kutaisi", "zugdidi", "batumi", "rustavi"],
};

export const CONTRIBUTION_KEYWORDS = [
  // Authorship roles
"first author",
"last author",
"joint first author",
"joint senior author",
"co-first author",
"cofirst author",
"co-senior author",
"cosenior author",
"senior author",
"shared first author",
"shared senior author",
"equal contribution",
"equal authorship",
"contributed equally",
"equally contributed",
"lead author",
"lead contact",
"principal investigator",
"guarantor",

// Correspondence
"corresponding author",
"co-corresponding author",
"correspondence",
"contact author",
"author for correspondence",
"reprint author",
"reprint requests",
"author to whom correspondence should be addressed",

// Group / consortium / collaboration
"on behalf of",
"writing committee",
"steering committee",
"investigators",
"study group",
"consortium",
"collaborator",
"working group",
"task force",
"research network",
"trial investigators",
"collaborative group",


  // Editorial roles
"editorial board",
"associate editor",
"chief editor",
"editor-in-chief",
"handling editor",
"guest editor",
"academic editor",
"section editor",
"reviewer",
"peer reviewer",

// Special notes
  "deceased",
  "technical contact",
  "posthumous authorship",
];

export const US_STATES = new Set([
  // For Country Resolver
  // Georgia is handled as a special case in Country Resolver
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington DC",
  "District of Columbia",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
]);

export const US_STATE_ABBREVIATIONS = new Set([
  // For Country Resolver
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DC",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
]);
