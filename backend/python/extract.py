# backend/python/extract.py

import pdfplumber
import re
import json
import sys


def clean_number(val):
    """Remove commas, currency symbols, ±, percent signs and convert to float if possible."""
    if not val:
        return None
    v = (
        val.replace(",", "")
        .replace("$", "")
        .replace("±", "")
        .replace("%", "")
        .strip()
    )
    try:
        return float(v)
    except ValueError:
        return v


def parse_lease(text):
    """Parse a lease-type PDF (single premises) for key fields."""
    data = {
        "doc_type": "lease",
        "property_name": None,
        "address": None,
        "tenant": None,
        "suite": None,
        "square_feet": None,
        "base_rent": None,
        "lease_start": None,
        "lease_end": None,
        "unit_type": None,             # use / type of space
        "additional_features": [],     # list of bullet points
        "rent_escalation_percent": None,
        "rent_escalation_text": None,
        "security_deposit_amount": None,
        "security_deposit_text": None,
        "renewal_option_text": None,
        "renewal_notice_days": None,
    }


    # LANDLORD / PROPERTY NAME

    m = re.search(r"Landlord:\s*(.+?)(?:\s+Tenant:|$)", text, re.IGNORECASE)
    if m:
        data["property_name"] = m.group(1).strip()


    # TENANT
    
    m = re.search(r"Tenant:\s*(.+)", text)
    if m:
        data["tenant"] = m.group(1).strip()


    # SUITE + ADDRESS

    m = re.search(
        r"located at Suite\s*([A-Za-z0-9\-]+)\s*,\s*(.+?)\s*\(\"Premises\"\)",
        text,
        re.IGNORECASE | re.DOTALL,
    )
    if m:
        data["suite"] = m.group(1).strip()
        addr = " ".join(m.group(2).split())
        data["address"] = addr

    
    if data["suite"] is None:
        m = re.search(r"Suite[:\s]+([A-Za-z0-9\-]+)", text, re.IGNORECASE)
        if m:
            data["suite"] = m.group(1).strip()

    
    if data["address"] is None:
        m = re.search(r"Address:\s*(.+)", text, re.IGNORECASE)
        if m:
            data["address"] = m.group(1).strip()


    # SQUARE FEET
    
    m = re.search(
        r"approximately\s*([\d,]+)\s*rentable square feet",
        text,
        re.IGNORECASE,
    )
    if m:
        data["square_feet"] = clean_number(m.group(1))

   
    if data["square_feet"] is None:
        m = re.search(r"Square\s*Feet[:\s]+([\d,]+)", text, re.IGNORECASE)
        if m:
            data["square_feet"] = clean_number(m.group(1))


    # BASE RENT
    
    m = re.search(
        r"base monthly rent of\s*\$?([\d,]+)",
        text,
        re.IGNORECASE,
    )
    if m:
        data["base_rent"] = clean_number(m.group(1))

    if data["base_rent"] is None:
        m = re.search(r"Base\s*Rent[:\s]+\$?([\d,]+)", text, re.IGNORECASE)
        if m:
            data["base_rent"] = clean_number(m.group(1))


    # LEASE START & END

    m = re.search(
        r"lease term shall commence on\s*([\d/]+)\s*and expire on\s*([\d/]+)",
        text,
        re.IGNORECASE,
    )
    if m:
        data["lease_start"] = m.group(1).strip()
        data["lease_end"] = m.group(2).strip()

    if data["lease_start"] is None:
        m = re.search(r"Lease Start(?: Date)?:\s*([\d/]+)", text, re.IGNORECASE)
        if m:
            data["lease_start"] = m.group(1).strip()

    if data["lease_end"] is None:
        m = re.search(r"Lease End(?: Date)?:\s*([\d/]+)", text, re.IGNORECASE)
        if m:
            data["lease_end"] = m.group(1).strip()


    # USE / UNIT TYPE

    m = re.search(
        r"rentable square feet\s*for\s+(.+?)\s+use,",
        text,
        re.IGNORECASE,
    )
    if m:
        data["unit_type"] = m.group(1).strip()

    if data["unit_type"] is None:
        m = re.search(
            r"used exclusively for\s+(.+?)\.",
            text,
            re.IGNORECASE,
        )
        if m:
            data["unit_type"] = m.group(1).strip()  


    # ADDITIONAL FEATURES

    m = re.search(
        r"4\.\s*Additional Features:(.+?)5\.\s*Rent Escalations",
        text,
        re.IGNORECASE | re.DOTALL,
    )
    if m:
        block = m.group(1)
        lines = [
            ln.strip(" -\t")
            for ln in block.splitlines()
            if ln.strip().strip("-")
        ]
        data["additional_features"] = lines


    # RENT ESCALATIONS
    
    m = re.search(
        r"5\.\s*Rent Escalations:(.+?)6\.\s*Security Deposit",
        text,
        re.IGNORECASE | re.DOTALL,
    )
    if m:
        block = " ".join(m.group(1).split())
        data["rent_escalation_text"] = block
        m_pct = re.search(r"([\d\.]+)\s*%", block)
        if m_pct:
            try:
                data["rent_escalation_percent"] = float(m_pct.group(1))
            except ValueError:
                pass


    # SECURITY DEPOSIT
   
    m = re.search(
        r"6\.\s*Security Deposit:(.+?)(?:7\.|IN WITNESS)",
        text,
        re.IGNORECASE | re.DOTALL,
    )
    if m:
        block = " ".join(m.group(1).split())
        data["security_deposit_text"] = block

        # If it says "one month's rent" and we know base_rent, assume equal
        if data["base_rent"] is not None and "one month" in block.lower():
            data["security_deposit_amount"] = data["base_rent"]


    # RENEWAL OPTION
   
    m = re.search(
        r"8\.\s*Renewal Option:(.+?)(?:IN WITNESS|$)",
        text,
        re.IGNORECASE | re.DOTALL,
    )
    if m:
        block = " ".join(m.group(1).split())
        data["renewal_option_text"] = block

        # Notice days, e.g. "90 days' prior written notice"
        m_days = re.search(r"(\d+)\s*days", block, re.IGNORECASE)
        if m_days:
            try:
                data["renewal_notice_days"] = int(m_days.group(1))
            except ValueError:
                pass

        # Term length in years, e.g. "additional five (5) year term"
        m_term = re.search(
            r"additional\s+(?:[\w]+\s*)?\(?(?P<num>\d+)\)?\s*year",
            block,
            re.IGNORECASE,
        )
        if m_term:
            try:
                data["renewal_term_years"] = int(m_term.group("num"))
            except ValueError:
                pass

    return data


# def parse_flyer(text):
#     """Parse flyer-type PDFs: address, size, economics, and contacts."""
#     data = {
#         "doc_type": "flyer",
#         "property_name": None,
#         "address": None,

#         # size
#         "available_sf": None,
#         "building_size_sf": None,
#         "site_area_acres": None,
#         "site_area_sf": None,

#         # economics
#         "lease_rate_psf": None,
#         "lease_rate_type": None,  # e.g. NNN, FSG
#         "nnn_psf": None,

#         # misc
#         "year_built": None,
#         "zoning": None,
#         "parking_spaces": None,

#         # contacts
#         "contacts": [],  # list of {name, phone, email}
#     }

#     lines = [ln.rstrip() for ln in text.split("\n")]
#     non_empty = [ln.strip() for ln in lines if ln.strip()]

#     # ---------------- PROPERTY NAME + ADDRESS ----------------

#     # Pattern A: "9201 FEDERAL BOULEVARD\nWESTMINSTER, CO 80221"
#     m = re.search(
#         r"(^\s*(\d{3,6}\s+[A-Z0-9 .,&'-]+)\s*\n\s*([A-Z][A-Za-z]+,\s*[A-Z]{2}\s*\d{5}))",
#         text,
#         re.MULTILINE,
#     )
#     if m:
#         name = m.group(2).strip()
#         city_line = m.group(3).strip()
#         data["property_name"] = name
#         data["address"] = f"{name}, {city_line}"

#     # Pattern B: "800 RESEARCH DRIVE ... WILMINGTON, MA"
#     if data["property_name"] is None:
#         m = re.search(
#             r"^\s*([\d,]+\s+[A-Z0-9\s/&\-]+?)\s*\n[^\n]*\bWILMINGTON,\s*MA",
#             text,
#             re.IGNORECASE | re.MULTILINE,
#         )
#         if m:
#             name = m.group(1).strip()
#             data["property_name"] = name
#             data["address"] = f"{name}, Wilmington, MA"

#     # Fallback: first non-empty line as property_name
#     if data["property_name"] is None and non_empty:
#         data["property_name"] = non_empty[0]

#     # ---------------- SIZE FIELDS ----------------

#     # Available SF:
#     #  "±20,107 SF AVAILABLE"
#     #  "2,640 SF RETAIL SPACE FOR LEASE"
#     m = re.search(r"±\s*([\d,]+)\s*SF\s+AVAILABLE", text, re.IGNORECASE)
#     if not m:
#         m = re.search(
#             r"([\d,]+)\s*SF\s+(RETAIL|OFFICE|MEDICAL|SPACE)\s+FOR\s+LEASE",
#             text,
#             re.IGNORECASE,
#         )
#     if m:
#         data["available_sf"] = clean_number(m.group(1))

#     # Building size:
#     #  "Building Size\n±52,107 SF"
#     m = re.search(
#         r"Building Size[\s\S]{0,80}?±?\s*([\d,]+)\s*SF",
#         text,
#         re.IGNORECASE,
#     )
#     if m:
#         data["building_size_sf"] = clean_number(m.group(1))

#     # Extra heuristic: if we see multiple SF numbers, use
#     #  - smallest as available_sf
#     #  - largest as building_size_sf (if not already set)
#     sf_matches = re.findall(r"±?\s*([\d,]{3,})\s*SF\b", text, re.IGNORECASE)
#     sf_nums = [
#         clean_number(x) for x in sf_matches
#         if x and isinstance(clean_number(x), (int, float))
#     ]
#     if sf_nums:
#         sf_min = min(sf_nums)
#         sf_max = max(sf_nums)
#         if data["available_sf"] is None:
#             data["available_sf"] = sf_min
#         if data["building_size_sf"] is None and sf_max >= sf_min:
#             data["building_size_sf"] = sf_max

#     # Site area: "Site Area\n±18.67 Acres"
#     m = re.search(
#         r"Site Area\s*[\r\n]+±?\s*([\d\.]+)\s*Acres?",
#         text,
#         re.IGNORECASE,
#     )
#     if m:
#         try:
#             data["site_area_acres"] = float(m.group(1))
#         except ValueError:
#             data["site_area_acres"] = m.group(1).strip()

#     # Site area SF: "(17,860 SF)"
#     m = re.search(
#         r"\(\s*([\d,]+)\s*SF\s*\)",
#         text,
#         re.IGNORECASE,
#     )
#     if m:
#         data["site_area_sf"] = clean_number(m.group(1))

#     # ---------------- ECONOMICS ----------------

#     # "LEASE RATE: $30.00/SF NNN"
#     m = re.search(
#         r"LEASE\s+RATE:\s*\$?([\d,\.]+)\s*/SF\s*([A-Z]+)?",
#         text,
#         re.IGNORECASE,
#     )
#     if m:
#         data["lease_rate_psf"] = clean_number(m.group(1))
#         if m.group(2):
#             data["lease_rate_type"] = m.group(2).upper()

#     # "NNN: $9.00/SF (EST.)"
#     m = re.search(
#         r"\bNNN:\s*\$?([\d,\.]+)\s*/SF",
#         text,
#         re.IGNORECASE,
#     )
#     if m:
#         data["nnn_psf"] = clean_number(m.group(1))

#     # ---------------- YEAR BUILT / ZONING / PARKING ----------------

#     # "Built 1984"
#     m = re.search(r"\bBuilt\s+(\d{4})", text, re.IGNORECASE)
#     if m:
#         try:
#             data["year_built"] = int(m.group(1))
#         except ValueError:
#             data["year_built"] = m.group(1).strip()

#     # "Zoned C-1 Commercial"
#     m = re.search(
#         r"\bZoned\s+([A-Za-z0-9\- ]+)",
#         text,
#         re.IGNORECASE,
#     )
#     if m:
#         data["zoning"] = m.group(1).strip()

#     # e.g. "119 spaces"
#     m = re.search(
#         r"([\d,]+)\s+spaces",
#         text,
#         re.IGNORECASE,
#     )
#     if m:
#         try:
#             data["parking_spaces"] = int(m.group(1).replace(",", ""))
#         except ValueError:
#             data["parking_spaces"] = None

#     # ---------------- CONTACT DETAILS ----------------

#     contacts = []
#     email_pattern = re.compile(r"[\w\.\-+]+@[A-Za-z0-9\.\-]+\.[A-Za-z]{2,}")
#     phone_pattern = re.compile(r"\+?\d[\d\s\-\(\)]{7,}\d")

#     for i, line in enumerate(lines):
#         emails = email_pattern.findall(line)
#         if not emails:
#             continue

#         for email in emails:
#             # Find phone near the email (same / neighbor lines)
#             phone = None
#             for offset in [0, -1, 1, -2, 2]:
#                 j = i + offset
#                 if 0 <= j < len(lines):
#                     m_phone = phone_pattern.search(lines[j])
#                     if m_phone:
#                         phone = m_phone.group(0).strip()
#                         break

#             # Try to find a name a bit above the email line
#             name = None
#             for k in range(i - 1, -1, -1):
#                 cand = lines[k].strip()
#                 if not cand:
#                     continue
#                 if "@" in cand:
#                     continue
#                 # skip obvious labels / titles
#                 if re.search(
#                     r"(Executive|Vice President|Senior|Associate|Director|CONTACT US)",
#                     cand,
#                     re.IGNORECASE,
#                 ):
#                     continue
#                 # skip phone-like / mostly numeric lines
#                 if re.search(r"\d", cand) and not re.search(
#                     r"[A-Za-z]{2,}\s+[A-Za-z]{2,}", cand
#                 ):
#                     continue
#                 # looks like a name: keep first reasonable line
#                 name = cand
#                 break

#             # Fallback: name may be on same line before email
#             if name is None:
#                 prefix = line.split(email)[0].strip(" ,;-")
#                 if re.search(r"[A-Za-z]{2,}\s+[A-Za-z]{2,}", prefix):
#                     name = prefix

#             # Safety: don't use phone itself as name
#             if name and phone and name.strip() == phone.strip():
#                 name = None

#             contacts.append(
#                 {
#                     "name": name,
#                     "phone": phone,
#                     "email": email,
#                 }
#             )

#     # de-duplicate contacts by (email, phone)
#     unique = {}
#     for c in contacts:
#         key = (c["email"], c["phone"])
#         if key not in unique:
#             unique[key] = c
#     data["contacts"] = list(unique.values())

#     return data

def parse_flyer(text):
    """Parse flyer-type PDFs: address, size, economics, and contacts."""
    data = {
        "doc_type": "flyer",
        "property_name": None,
        "address": None,

        # size
        "available_sf": None,
        "building_size_sf": None,
        "site_area_acres": None,
        "site_area_sf": None,

        # economics
        "lease_rate_psf": None,
        "lease_rate_type": None, 
        "nnn_psf": None,

        # misc
        "year_built": None,
        "zoning": None,
        "parking_spaces": None,

        # contacts
        "contacts": [],  # list of {name, phone, email}
    }

    lines = [ln.rstrip() for ln in text.split("\n")]
    non_empty = [ln.strip() for ln in lines if ln.strip()]


    # Property name + address

    # Pattern A: "9201 FEDERAL BOULEVARD\nWESTMINSTER, CO 80221"
    m = re.search(
        r"(^\s*(\d{3,6}\s+[A-Z0-9 .,&'-]+)\s*\n\s*([A-Z][A-Za-z]+,\s*[A-Z]{2}\s*\d{5}))",
        text,
        re.MULTILINE,
    )
    if m:
        name = m.group(2).strip()
        city_line = m.group(3).strip()
        data["property_name"] = name
        data["address"] = f"{name}, {city_line}"

    # Pattern B: "800 RESEARCH DRIVE ... WILMINGTON, MA"
    if data["property_name"] is None:
        m = re.search(
            r"^\s*([\d,]+\s+[A-Z0-9\s/&\-]+?)\s*\n[^\n]*\bWILMINGTON,\s*MA",
            text,
            re.IGNORECASE | re.MULTILINE,
        )
        if m:
            name = m.group(1).strip()
            data["property_name"] = name
            data["address"] = f"{name}, Wilmington, MA"

   # If still missing, use first non-empty line as the name
    if data["property_name"] is None and non_empty:
        data["property_name"] = non_empty[0]


    
    # Size fields (available SF, building size, site area)

    # Available SF

    m = re.search(r"±\s*([\d,]+)\s*SF\s+AVAILABLE", text, re.IGNORECASE)
    if not m:
        m = re.search(
            r"([\d,]+)\s*SF\s+(RETAIL|OFFICE|MEDICAL|SPACE)\s+FOR\s+LEASE",
            text,
            re.IGNORECASE,
        )
    if m:
        data["available_sf"] = clean_number(m.group(1))

    # Building size

    m = re.search(
        r"Building Size[\s\S]{0,80}?±?\s*([\d,]+)\s*SF",
        text,
        re.IGNORECASE,
    )
    if m:
        data["building_size_sf"] = clean_number(m.group(1))

    # If building size missing, assume largest SF is total building size
    if data["building_size_sf"] is None:
        m = re.findall(r"±?\s*([\d,]{4,})\s*SF\b", text, re.IGNORECASE)
        nums = [clean_number(x) for x in m if x]
        nums = [n for n in nums if isinstance(n, (int, float))]
        if nums:
            sf_min = min(nums)
            sf_max = max(nums)
            if data["available_sf"] is None:
                data["available_sf"] = sf_min
            if data["building_size_sf"] is None and sf_max >= sf_min:
                data["building_size_sf"] = sf_max

    # Site area
    m = re.search(
        r"Site Area\s*[\r\n]+±?\s*([\d\.]+)\s*Acres?",
        text,
        re.IGNORECASE,
    )
    if m:
        try:
            data["site_area_acres"] = float(m.group(1))
        except ValueError:
            data["site_area_acres"] = m.group(1).strip()

    # Site area SF
    m = re.search(
        r"\(\s*([\d,]+)\s*SF\s*\)",
        text,
        re.IGNORECASE,
    )
    if m:
        data["site_area_sf"] = clean_number(m.group(1))


    # ECONOMICS 

    # LEASE RATE
    m = re.search(
        r"LEASE\s+RATE:\s*\$?([\d,\.]+)\s*/SF\s*([A-Z]+)?",
        text,
        re.IGNORECASE,
    )
    if m:
        data["lease_rate_psf"] = clean_number(m.group(1))
        if m.group(2):
            data["lease_rate_type"] = m.group(2).upper()

    # "NNN
    m = re.search(
        r"\bNNN:\s*\$?([\d,\.]+)\s*/SF",
        text,
        re.IGNORECASE,
    )
    if m:
        data["nnn_psf"] = clean_number(m.group(1))


    # YEAR BUILT / ZONING / PARKING 

    # e.g."Built 1984"
    m = re.search(r"\bBuilt\s+(\d{4})", text, re.IGNORECASE)
    if m:
        try:
            data["year_built"] = int(m.group(1))
        except ValueError:
            data["year_built"] = m.group(1).strip()

    # e.g.  "Zoned C-1 Commercial"
    m = re.search(
        r"\bZoned\s+([A-Za-z0-9\- ]+)",
        text,
        re.IGNORECASE,
    )
    if m:
        data["zoning"] = m.group(1).strip()

    # Parking spaces, e.g. "119 spaces"
    m = re.search(
        r"([\d,]+)\s+spaces",
        text,
        re.IGNORECASE,
    )
    if m:
        try:
            data["parking_spaces"] = int(m.group(1).replace(",", ""))
        except ValueError:
            data["parking_spaces"] = None

    # CONTACT DETAILS (name, phone, email)

    contacts = []
    email_pattern = re.compile(r"[\w\.\-+]+@[A-Za-z0-9\.\-]+\.[A-Za-z]{2,}")
    phone_pattern = re.compile(r"\+?\d[\d\s\-\(\)]{7,}\d")

    def pick_name_from_line(cand: str, email: str) -> str:
        """
        From a line like 'JOHN WILSON KENDALL LYNCH CHRISTIAN VALLIS'
        and an email like 'john.wilson15@cbre.com', try to extract 'JOHN WILSON'.
        """
        tokens = cand.split()
        if not tokens:
            return cand

        email_local = email.split("@")[0]
        words = [w for w in re.split(r"[._\d]+", email_local) if w]
        if not words:
            return cand

        tokens_lower = [t.lower() for t in tokens]
        try:
            i = tokens_lower.index(words[0].lower())
        except ValueError:
            return cand

        
        if len(words) > 1:
            for j in range(i + 1, len(tokens)):
                if tokens_lower[j].startswith(words[1].lower()):
                    return " ".join(tokens[i : j + 1])
        return tokens[i]

    for i, line in enumerate(lines):
        emails = email_pattern.findall(line)
        if not emails:
            continue

        for email in emails:
           
            phone = None
            for offset in [0, 1, 2, -1, -2]:
                j = i + offset
                if 0 <= j < len(lines):
                    m_phone = phone_pattern.search(lines[j])
                    if m_phone:
                        phone = m_phone.group(0).strip()
                        break

            
            name = None
            for k in range(i - 1, -1, -1):
                cand = lines[k].strip()
                if not cand:
                    continue
                if "@" in cand:
                    continue

                
                if re.search(
                    r"(Executive|Vice President|Senior|Associate|Director|CONTACT US)",
                    cand,
                    re.IGNORECASE,
                ):
                    continue

               
                if ":" in cand and not re.search(
                    r"[A-Za-z]{2,}\s+[A-Za-z]{2,}", cand
                ):
                    continue
                if re.match(
                    r"^(TI|LEASE|RATE|RENT|NNN|AVAILABLE)\b",
                    cand.strip().upper(),
                ):
                    continue

               
                if re.search(r"\d", cand) and not re.search(
                    r"[A-Za-z]{2,}\s+[A-Za-z]{2,}", cand
                ):
                    continue

                
                name = cand
                break

   
            if name is None:
                prefix = line.split(email)[0].strip(" ,;-")
                if re.search(r"[A-Za-z]{2,}\s+[A-Za-z]{2,}", prefix):
                    name = prefix

            
            if name is not None:
                name = pick_name_from_line(name, email)

    
            if name and phone and name.strip() == phone.strip():
                name = None

            contacts.append(
                {
                    "name": name,
                    "phone": phone,
                    "email": email,
                }
            )

    
    unique = {}
    for c in contacts:
        key = c["email"]
        if key not in unique:
            unique[key] = c
        else:
   
            if unique[key].get("phone") is None and c.get("phone"):
                unique[key] = c

    data["contacts"] = list(unique.values())

    return data



def extract_data(pdf_path):
    full_text = ""
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            full_text += text + "\n"

    # Decide whether the PDF is a lease or a marketing flyer.

    # Lease: look for explicit lease agreement language
    if re.search(r"\bCOMMERCIAL LEASE AGREEMENT\b|\bLEASE AGREEMENT\b", full_text, re.IGNORECASE):
        structured = parse_lease(full_text)

    # Otherwise treat it as a flyer (marketing / space-for-lease)
    else:
        structured = parse_flyer(full_text)

    return {
        "raw_text": full_text,
        "structured": structured,
    }


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No PDF path provided"}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    result = extract_data(pdf_path)
    print(json.dumps(result))
