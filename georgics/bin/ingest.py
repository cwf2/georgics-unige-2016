#!/usr/bin/env python3

import os
import argparse
import sqlite3
import tessdb

_default_db_name = os.path.join("db", "tess.db")

#
# main
#

if __name__ == "__main__":
    """Load text(s) from XML files and save in database"""
    
    # get command line arguments
    parser = argparse.ArgumentParser(
        description = "Ingest Tess files in XML format."
    )
    parser.add_argument("files", metavar = "FILE", nargs = "+", type = str,
        help = "File(s) to ingest"
    )
    parser.add_argument("--db", metavar = "db_file", type = str,
        default = _default_db_name,
        help = "Name of sqlite database"
    )
    args = parser.parse_args()
    
    # initialize the database
    db = tessdb.TessDB(args.db, create=True)
    
    # process the files
    for i, file in enumerate(args.files, start=1):
        print("[{0}/{1}] {2}".format(i, len(args.files), file))
        db.new_text_from_xml(file)

