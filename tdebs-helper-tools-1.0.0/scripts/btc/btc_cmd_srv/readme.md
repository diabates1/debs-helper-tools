
# Prerequisites

EBS available at `/data/local/tools/ebs/`

Also make sure that no other interface is connected!

# Usage

~~~
cmd="reset"
NODE_PATH=/data/local/tools/ebs/ebs/tools/node ./btc_cmd_srv.js --debug error,info -i 0.0.0.0 -p 5445 -c "${cmd}"
~~~
