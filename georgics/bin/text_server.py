#!/usr/bin/env python3
"""
    Text server for the Georgics course
    
    Serve requests for specific passages from the Tesserae corpus,
    used to support the online display both of our target passages
    from Vergil's Georgics, and also of the various source passages
    cited in our intertextual annotations.
"""

import os
import json
import bottle
import tessdb

app = application = bottle.Bottle()
_db_name = "/vagrant/georgics/db/tess.db"

def pass_error(err):
    """Transmit tessdb error to bottle abort()"""
    
    bottle.abort(err.httpstatus, err.message)


@app.route("/")
def show_index():
    """Index page"""
    
    return bottle.static_file("index.html", root="html")


@app.route("/query/<name>")
def query_text(name):
    """Check whether text exists"""
    
    response = tessdb.TessDB(_db_name).query_name(name, match=True)
    
    return {"response":response}


@app.route("/query/<name>/id/<first:int>")
@app.route("/query/<name>/id/<first:int>/<last:int>")
def query_id(name, first, last=None):
    """Request passage by id"""
    
    try:
        text = tessdb.TessDB(_db_name).select_text(name)
    except tessdb.TextError as err:
        pass_error(err)
    
    try:
        units = text.select_by_id(first, last)
    except tessdb.IDError as err:
        pass_error(err)
        
    response = [unit.as_dict() for unit in units]

    return {"response": response}


@app.route("/query/<name>/loc/<first>")
@app.route("/query/<name>/loc/<first>/<last>")
def query_loc(name, first, last=None):
    """Request passage by loc"""
    
    # get the id for the requested loc
    
    try:
        text = tessdb.TessDB(_db_name).select_text(name)
    except tessdb.TextError as err:
        pass_error(err)

    try:
        units = text.select_by_loc(first)
    except tessdb.LocError as err:
        pass_error(err)
    
    units.sort(key=lambda unit: unit.id)
    
    first_id = second_id = units[0].id
    
    # if two locs requested, get the second id
    
    if last is not None:
        try:
            units = text.select_by_loc(last)
        except tessdb.LocError as err:
            pass_error(err)
        
        units.sort(key=lambda unit: unit.id)
        
        second_id = units[0].id
    
    # retrieve the corresponding set of units
    
    return query_id(name, first_id, second_id)


#
# if invoked from the command line, use Bottle's built-in
# development server to serve the app - not run when launched
# through nginx/uwsgi

if __name__ == "__main__":
    bottle.run(app,
        host = "0.0.0.0",
        port = "8080",
        debug = True
    )
