

# List sprints or backlog status and issue content

~~~
./projects.bash --filter flts/flt_red_SW_projects.json --what list --debug error,info -b --sprints 2017_W26_sprint
./projects.bash --filter flts/flt_red_SW_projects.json --what list --debug error,info -b --sprints 2017_W23_sprint,2017_W24_sprint,2017_W25_sprint,2017_W26_sprint,2017_W27_sprint,2017_W28_sprint,2017_W29_sprint,2017_W30_sprint
~~~


# Create a sprint (-s), backlog (-b) or playground (-p) if version does not already exist.

~~~
./projects.bash --filter flts/flt_red_SW_projects.json --what create --debug error,info -b --sprints 2017_W26_sprint
~~~


# Closing a sprint (backlog is not allowed here, internally protected).

~~~
./projects.bash --filter flts/flt_red_SW_projects.json --what close --debug error,info --sprints 2017_W23_sprint
~~~

# Get all updated issued afeter a date.

~~~
./projects.bash --what updated --debug error,info --updated 2018.14
./projects.bash --filter flts/flt_red_SW_IssueUpdate.json --what updated --debug error,info --updated 2018.14

./projects.bash --filter flts/flt_red_SW_IssueUpdate.json --what updated --debug error,info --updated 2018.14 | sort -u

./projects.bash --filter flts/flt_red_SW_IssueUpdate.json --what updated --debug error,info --updated 2018.14 | sort -u | grep 'Dominique\|TD_technical_team_SW'
~~~

**Note**

To be used with a macro like: dom_sprints 18 25 35

~~~
dom_sprints () {
  year=$1
  sta=$2
  sto=$3
  for i in `seq ${sta} ${sto}`
  do
    printf "20%02d_W%02d_sprint" ${year} ${i}
    [ ${i} -lt ${sto} ] && printf ","
  done
  printf "\n"
}
~~~
