Not using controller this time. 

HTTP status:
100 Continue
101 Switching Protocols
103 Early Hints
200 OK
201 Created
202 Accepted
203 Non-Authoritative Information
204 No Content
205 Reset Content
206 Partial Content
300 Multiple Choices
301 Moved Permanently
302 Found
303 See Other
304 Not Modified
307 Temporary Redirect
308 Permanent Redirect
400 Bad Request
401 Unauthorized
402 Payment Required
403 Forbidden
404 Not Found
405 Method Not Allowed
406 Not Acceptable
407 Proxy Authentication Required
408 Request Timeout
409 Conflict
410 Gone
411 Length Required
412 Precondition Failed
413 Payload Too Large
414 URI Too Long
415 Unsupported Media Type
416 Range Not Satisfiable
417 Expectation Failed
418 I'm a teapot
422 Unprocessable Entity
425 Too Early
426 Upgrade Required
428 Precondition Required
429 Too Many Requests
431 Request Header Fields Too Large
451 Unavailable For Legal Reasons
500 Internal Server Error
501 Not Implemented
502 Bad Gateway
503 Service Unavailable
504 Gateway Timeout
505 HTTP Version Not Supported
506 Variant Also Negotiates
507 Insufficient Storage
508 Loop Detected
510 Not Extended
511 Network Authentication Required





<h4>HOW TO CREATE ANOTHER DATABASE AS A BACKUP OR TEST</h4>

<h5>Pre-requisites: </h5>
<p>
1. Download Mongodb command line tools
2. Extract them to your local drive C
3. get the bin\ path from those folders (DIY Please, this is small work)
4. paste it to ENV, search env in windows searchbar
5. add the  FOR example: 
<br/>C:\mongodb cli\mongodb-database-tools-windows-x86_64-100.10.0\bin <br/>
to PATH of system and user viariables

</p>

<h5>Commands</h5>
<h6>1a. open folder in terminal, where you want to create backup in</h6> 
<h6>1b. create a backup in a folder of the database you want to create testDB/Backup of, from atlas </h6> 
D:\MYFOLDER\mongodb JSON duplicate>  <strong>mongodump</strong> --uri "mongodb+srv:// &lt;username&gt;: &lt;password&gt;@cluster123.12345s.mongodb.net/Database_to_be_duplicated" --db="Database_to_be_duplicated"

<h6></h6> 
2. could do this for just seperate location if you have ADHD , jkjk , however it is same thing 
THIS ONE IS NOT RECOMMENDED (just use if you want to create another instance {idk what this is called})
mongodb+srv:// &lt;username&gt;: &lt;password&gt;@cluster123.12345s.mongodb.net/the_new_duplicate_database_name

<h6>3. Now restore it to your Atlas</h6> 
D:\MYFOLDER\mongodb JSON duplicate>  <strong>mongorestore</strong> --uri "mongodb+srv:// &lt;username&gt;: &lt;password&gt;@cluster123.12345s.mongodb.net/the_new_duplicate_database_name" --db the_new_duplicate_database_name   "D:\MYFOLDER\mongodb JSON duplicate\dump\the_new_duplicate_database_name"