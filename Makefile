FIGURES = $(patsubst %.dot,%.pdf,$(wildcard *.dot))

STDPDF = xelatex rulebook.tex | grep -v "^Overfull"

default: refresh

clean:
	rm -f *.aux rulebook.pdf *.idx *.ilg *.ind *.log *.lot *.lof *.tmp *.out

refresh:
	$(STDPDF)
	open rulebook.pdf

rebuild:
	$(STDPDF)
	$(STDPDF)
	$(STDPDF)
	open rulebook.pdf

full: $(FIGURES) reindex

reindex:
	$(STDPDF)
	$(STDPDF)
	$(STDPDF)
	makeindex generalindex
	makeindex libraryindex
	makeindex grammarindex
	$(STDPDF)
	$(STDPDF)
	open rulebook.pdf

### Makefile ends here
