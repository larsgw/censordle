fetch(){
	curl "https://en.wikipedia.org/wiki/Special:Export/Wikipedia:Unusual_articles/$1" | \
		xpath -q -e '//text' | \
		egrep "'''\[\[.*\]\]'''" -o | sed "s/'''\[\[//g;s/\]\]'''//g;s/|.*//g" | \
		perl -MMIME::Base64 -ne 'print encode_base64($_)' > "$1.b64"
}

fetch "Death"
fetch "Folklore"
fetch "Food"
fetch "History"
fetch "Language"
fetch "Lists"
fetch "Military"
fetch "Science"
fetch "Questions"
fetch "Sports"
fetch "Mathematics_and_numbers"
fetch "Other_pages"
fetch "Places_and_infrastructure"
fetch "Popular_culture,_entertainment_and_the_arts"
fetch "Religion_and_spirituality"
fetch "Society,_economy_and_law"
fetch "Technology,_inventions_and_products"
cat *.b64 | sort -R | paste -s -d, | sed 's/,/","/g;s/^/["/;s/$/"]/' > unusual.json
rm -f *.b64
