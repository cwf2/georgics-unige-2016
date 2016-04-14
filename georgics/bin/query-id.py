#!/usr/bin/env python3
"""
    Query the database for a set of lines from a particular table
    Wants table name, and first, last lines by id
    Returns a json list of text units
"""


import os
import argparse
import tessdb

_default_db_name = os.path.join("db", "tess.db")


#
# Main
#

if __name__ == "__main__":

    # get command line arguments
    parser = argparse.ArgumentParser(
        description = "Query corpus and return passages."
    )
    parser.add_argument("--name", metavar="NAME", type=str, required=True,
        help = "Text to query"
    )
    parser.add_argument("--first", metavar="ID", type=int, required=True,
        help = "First text unit id in range"
    )
    parser.add_argument("--last", metavar = "ID", type = int,
        help = "Last text unit id in range"
    )
    parser.add_argument("--db", metavar = "db_file", type = str,
        default = _default_db_name, 
        help = "Name of sqlite database"
    )
    args = parser.parse_args()
    
    # connect to database
    db = tessdb.TessDB(args.db)
    
    # locate requested text
    text = db.select_text(args.name, fail=True)
    
    # retrieve textunits
    units = [tu.as_json() for tu in 
        text.select_by_id(first=args.first, last=args.last)
    ]
    
    print(units)

    