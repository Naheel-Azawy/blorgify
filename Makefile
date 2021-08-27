all: node_modules dist

dist:
	npm run build

node_modules:
	npm install

install:
	cp ./dist/blorgify /usr/bin/
	chmod +x /usr/bin/blorgify

uninstall:
	rm -f /usr/bin/blorgify

clean:
	rm -rf dist node_modules package-lock.json

.PHONY: install uninstall clean
