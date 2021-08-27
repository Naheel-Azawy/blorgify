#!/bin/sh
':' //; N=$(command -v node || command -v nodejs)
':' //; exec "$N" "$0" "$@"
;
