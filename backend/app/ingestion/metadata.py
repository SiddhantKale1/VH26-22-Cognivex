from pathlib import Path

DOCUMENT_MACHINE_MAP = {
    "G120_CU240BE2_op_instr_0117_en-US": {
        "machine_model": "sinamics-drive",
        "machine_name": "SINAMICS Drive",
        "manufacturer": "Siemens"
    },
    "G120_Safety_fct_man_0920_en-US": {
        "machine_model": "sinamics-drive",
        "machine_name": "SINAMICS Drive",
        "manufacturer": "Siemens"
    },
    "s71200_system_manual_en-US": {
        "machine_model": "siemens-s7-1200",
        "machine_name": "S7-1200 PLC",
        "manufacturer": "Siemens"
    },
    "s71200_system_manual_en-US_en-US": {
        "machine_model": "siemens-s7-1200",
        "machine_name": "S7-1200 PLC",
        "manufacturer": "Siemens"
    },
    "s71500_cpu1512c_1_pn_manual_en-US_en-US": {
        "machine_model": "siemens-s7-1500",
        "machine_name": "S7-1500 PLC",
        "manufacturer": "Siemens"
    }
}


def infer_machine_metadata(filename_or_stem: str) -> dict:
    stem = Path(filename_or_stem).stem
    if stem in DOCUMENT_MACHINE_MAP:
        return DOCUMENT_MACHINE_MAP[stem]
    
    stem_lower = stem.lower()
    if "g120" in stem_lower or "cu240" in stem_lower or "sinamics" in stem_lower:
        return {"machine_model": "sinamics-drive", "machine_name": "SINAMICS Drive", "manufacturer": "Siemens"}
    if "s71200" in stem_lower or "s7-1200" in stem_lower or "1200" in stem_lower:
        return {"machine_model": "siemens-s7-1200", "machine_name": "S7-1200 PLC", "manufacturer": "Siemens"}
    if "s71500" in stem_lower or "s7-1500" in stem_lower or "1500" in stem_lower:
        return {"machine_model": "siemens-s7-1500", "machine_name": "S7-1500 PLC", "manufacturer": "Siemens"}
    
    return {"machine_model": "general", "machine_name": "Industrial Machinery", "manufacturer": "Siemens"}


def create_document_metadata(pdf_path: str) -> dict:
    path = Path(pdf_path)
    inferred = infer_machine_metadata(path.stem)
    return {
        "document_id": path.stem,
        "source_file": path.name,
        "file_type": "pdf",
        "machine_model": inferred["machine_model"],
        "machine_name": inferred["machine_name"],
        "manufacturer": inferred["manufacturer"]
    }