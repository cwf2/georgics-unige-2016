#!/usr/bin/env python3
"""
    Query the database for a locus
    Wants a text name, locus
    Returns a list of matching unit ids
"""

import os
import argparse
import tessdb

_default_db_name = os.path.join("db", "tess.db")


#
# main
#

if __name__ == "__main__":
    
    # get command line arguments
    parser = argparse.ArgumentParser(
        description = "Find the id of a given locus."
    )
    parser.add_argument("--name", metavar="NAME", type=str, required=True,
        help = "Text to query"
    )
    parser.add_argument("--loc", metavar="LOCUS", type=str, required=True,
        help = "Locus to search for"
    )
    parser.add_argument("--db", metavar = "db_file", type = str,
        default = _default_db_name,
        help = "Name of sqlite database"
    )
    args = parser.parse_args()
    
    # connect to database
    db = tessdb.TessDB(args.db)
    
    # locate requested text
    text = db.select_text(args.name)
    if text is None:
        raise tessdb.TableError
    
    # retrieve textunits
    units = [tu.as_json() for tu in 
        text.select_by_loc(args.loc)
    ]
    
    print(units)
