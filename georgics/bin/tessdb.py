import os
import sqlite3
import json
import xml.etree.ElementTree as ET

_text_params = [
    ("id", "int primary key"),
    ("loc", "text"),
    ("verse", "text"),
]


#
# Exception definitions
#

class Error(Exception):
    """Base class for exceptions in this module"""
    pass


class TextError(Error):
    """Requested table doesn't exist in the database"""
    
    def __init__(self, name):
        self.httpstatus = 404
        self.message = "Can't find text {0}".format(name)
    
    def __str__(self):
        return repr(self.message)
        

class LocError(Error):
    """Requested locus doesn't exist in the table"""
    
    def __init__(self, loc, name):
        self.httpstatus = 404
        self.message = "Can't find loc {0} in text {1}".format(
            loc, name
        )
        
    def __str__(self):
        return repr(self.message)


class IDError(Error):
    """Requested id doesn't exist in the table"""
    
    def __init__(self, id, name):
        self.httpstatus = 404
        self.message = "Can't find id {0} in text {1}".format(
            id, name
        )
        
    def __str__(self):
        return repr(self.message)


#
# Object classes
#

class TessDB:
    """A Tesserae corpus in a sqlite3 database"""
    
    def __init__(self, dbname, create=False):
        self.dbname = dbname
        
        if not os.path.exists(os.path.dirname(dbname)):
            if create:
                os.mkdir(os.path.dirname(dbname))
            else:
                pass
    
    
    def connect(self):
        """Return a sqlite3 Connection"""
        
        return sqlite3.connect(self.dbname)

    
    def new_text(self, name):
        """Initialize a new text object"""
        
        return TessText(name=name, db=self)
        
    
    def new_text_from_xml(self, file):
        """Initialize a text from a file"""
        
        # read the file
        xml = ET.parse(file)
        root = xml.getroot()
        
        # create the object
        name = root.get("id")
        textobj = TessText(name, db=self)

        # populate database from the file
        textobj.populate_from_xml(xml)
        
        return self
        
    
    def select_text(self, name, fail=True):
        """Return a text object corresponding to a table in the DB"""
        
        textobj = TessText(name=name, db=self)
        if textobj.table_exists():
            return textobj
        else:
            if fail:
                raise TextError(name)
            else:
                return None
    
    
class TessTextUnit:
    """Smallest element of text having a canonical locus"""
    
    def __init__(self, id=None, loc=None, verse=None):
        self.id = id
        self.loc = loc
        self.verse = verse
    
    
    def from_tuple(self, data):
        """Get values from a tuple"""
        
        self.id = data[0]
        self.loc = data[1]
        self.verse = data[2]
        
        return self


    def from_xml(self, xml):
        """Get values from an XML TextUnit element"""
        
        self.id = int(xml.get("id"))
        self.loc = str(xml.get("loc"))
        self.verse = str("".join(xml.itertext()))
        
        return self
        
    
    def as_tuple(self):
        """Represent the params as a tuple of values"""
        
        return (self.id, self.loc, self.verse)
    
    
    def as_json(self):
        """Respresent the params as a json dictionary"""
        
        return json.dumps({
            'id': self.id,
            'loc': self.loc,
            'verse': self.verse,
        })


class TessText:
    """Interface with a particular table"""
    
    def __init__(self, name, db, create=False):
        
        self.name = str(name)
        self.db = db
        
        if create:
            self.create_table()
    

    def create_table(self, clobber=True):
        """Create the table"""
        
        con = self.db.connect()
        
        if self.table_exists():
            if clobber:
                con.execute(
                    "delete from `{0}`".format(self.name)
                )
                con.commit()
            else:
                print("Table {0} already exists in db {1}!".format(
                    self.name, self.db.dbname)
                )
        else:
            # create the table
            cols = ", ".join([" ".join(pair) for pair in _text_params])
            
            con.execute(
                "create table `{0}` ({1})".format(self.name, cols)
            )
            
        con.commit()
        
        return self


    def table_exists(self):
        """Does the table exist in the database"""
        
        response = self.db.connect().execute(
            'select 1 from sqlite_master where type="table" and name = ?',
            [self.name]
        ).fetchone()
        
        if response is not None:
            return True
        
        return False


    def populate_from_xml(self, xml, clobber=True):
        """Extract text units from XML and store them in the DB"""
        
        # find all text units
        root = xml.getroot()
        textunits = root.findall("Text/TextUnit")
                
        # optionally destroy any existing data        
        self.create_table(clobber=clobber)

        # populate the table
        con = self.db.connect()
        con.executemany(
            "insert into `{0}` values(?, ?, ?)".format(self.name),
            [TessTextUnit().from_xml(tu).as_tuple() for tu in textunits]
        )
        con.commit()

        return self
    
    
    def select_by_id(self, first, last=None, fail=True):
        """Return text unit objects based on id"""
        
        if last is None:
            last = first
        elif last < first:
            last, first = first, last
        
        # connect to database
        con = self.db.connect()
        
        # check allowable values for id
        maxid = con.execute(
            "select max(id) from `{0}` ".format(self.name)
        ).fetchone()[0]
        
        if first < 0 or first > maxid:
            if fail:
                raise IDError(first, self.name)
            else:
                return []
        if last < 0 or last > maxid:
            if fail:
                raise IDError(last, self.name)
            else:
                return []
        
        results = self.db.connect().execute(
            "select id, loc, verse from `{0}` ".format(self.name) +
                "where id >= ? and id <= ?",
            [first, last]
        )
        
        textobj = [
            TessTextUnit().from_tuple(row) for row in results
        ]
        
        return textobj

    
    def select_by_loc(self, loc, fail=True):
        """Return text unit object based on locus"""
        
        results = self.db.connect().execute(
            "select id, loc, verse from `{0}` ".format(self.name) +
                "where loc == ?",
            [loc]
        )
        
        textobj = [
            TessTextUnit().from_tuple(row) for row in results
        ]
        
        if len(textobj) == 0:
            if fail:
                raise LocError(loc, self.name)
        
        return textobj

