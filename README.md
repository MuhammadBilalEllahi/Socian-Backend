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

## HOW TO DOCKER THIS NODE PROJECT

1. Create a file names Dockerfile in the root folder
2. write magic stuff there (present in code)
3. Add .dockerignore to ignore stuff ykwim
4. create docker-compose.yaml to do stuff like upload env to docker image.
5. It also helps name your first image and container

### Good stuff now

#

1. run <code> docker build -t pnpm-backend-beyondtheclass .</code>
   <br/><br/>it will run like this<br/><br/>
   <code>[+] Building 2.6s (12/12) FINISHED docker:desktop-linux
   => [internal] load build definition from Dockerfile 0.0s <br/>
   => => transferring dockerfile: 946B 0.0s <br/>
   => [internal] load metadata for docker.io/library/node:18-alpine 2.2s <br/>
   => [auth] library/node:pull token for registry-1.docker.io 0.0s <br/>
   => [internal] load .dockerignore 0.0s <br/>
   => => transferring context: 84B 0.0s <br/>
   => [1/6] FROM docker.io/library/ <br/>node:18-alpine@sha256:974afb6cbc0314dc6502b14243b8a39fbb2d04d975e9059dd066be3e274fbb25 0.0s
   => [internal] load build context 0.0s <br/>
   => CACHED [2/6] WORKDIR /app 0.0s <br/>
   => CACHED [3/6] RUN npm install -g pnpm 0.0s <br/>
   => CACHED [4/6] COPY package.json pnpm-lock.yaml ./ 0.0s <br/>
   => [6/6] COPY . . 0.1s <br/>
   => exporting to image 0.1s <br/>
   => => writing image  <br/>sha256:03a4519f5f0c6766faddab390283f6b6753b9f5234a1deced075050c0c288b87 0.0s
   => => naming to docker.io/library/backend-beyondtheclass-image-pnpm   <br/>
   </code>

2. Add .env data to docker
   <code>
   docker-compose up -d
   </code>
   <p>

[+] Running 2/2
<br/>
 ✔ Network backend_default  <bold>Created</bold>   0.0s
 <br/>
 ✔ Container backend-beyondtheclass-container-pnpm  <bold>Started</bold>
   </p>
3. Now check your container and image on Docker (GUI or CLI)

### DONE

# HOW TO EC2 THIS DOCKER

### AWS Settings

1. go to ec2
2. create new instances
3. set it up blah blah you're kind.. no spoon feeding
4. download .pem file. edit access to your user with read permission only.

### Handling SSH and uploading Project to Instance

1. open git bash with admin, then run with your .pem and public ec2 ip.
   <code>
   ssh -i "D:\Your Project\EC2-RSA\your-key.pem" ubuntu@1.12.12.123
   </code>
2. then upgrade everything on the ec2 ubuntu that you're now connected with on your computer
   <code>
    sudo apt-get update && sudo apt-get upgrade -y
    </code>
3. Install your lovely docker on that ubuntu (not your obv.)
   <code> sudo apt-get install -y docker.io</code>
4. and your lovely docker-compose  (not your obv.)
   <code>
   $ sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-\$(uname -s)-\$(uname -m)" -o /usr/local/bin/docker-compose
   </code>
   and
   <code>
sudo chmod +x /usr/local/bin/docker-compose
</code>
5. check the docker version.
   <code> docker-compose --version</code>

### 6. Fun part (Open another git bash -run as administrator)

- Don't run this on ssh ubuntu gitbash you were previously working on.
- Because that git bash (ec2 ssh) doesnot have your code there. common sense. (obv that i didn't have while doing this)
  
<code>
scp -i "D:\Your Project\EC2-RSA\your-key.pem" -r D:/Your\ Project/project-folder-name ubuntu@1.12.12.123:/home/ubuntu/
</code>
<bold>NOW Wait till your marriage... your project is uploading</bold>

#### just dont upload .git files or node_modules (or else say byebye to your precious time)

once upload complete. cd to your project path.

1. Do <code>docker login</code> and then
2. run <code> docker build -t pnpm-backend-beyondtheclass .</code>
3. <code> docker-compose up -d </code>
