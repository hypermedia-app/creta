#!/bin/sh

BASE=$1;

curl "$BASE/api/User" --upload-file resources/api/User.ttl
curl "$BASE/api/UsersCollection" --upload-file resources/api/UsersCollection.ttl
curl "$BASE/users" --upload-file resources/users.ttl
