# $pdflatex = 'xelatex -synctex=1 -interaction=nonstopmode -shell-escape';
# @generated_exts = (@generated_exts, 'synctex.gz');
# $pdf_mode = 1;
# $postscript_mode = $dvi_mode = 0;
# @cus_dep_list=(@cus_dep_list, "glo gls 0 makenomenclature");
# sub makenomenclature {
#     system("zhmakeindex -s zh.ist -t '$_[0]'.glg -o '$_[0]'.gls '$_[0]'.glo");
# }
# @generated_exts = (@generated_exts, 'glo gls glg acn acr alg');
# $makeindex = 'zhmakeindex -z pinyin -s zh.ist';

# $clean_ext = "bbl nav out snm idx ind glg glo gls slg slo sls"

$pdf_mode = 1;
$postscript_mode = 0;
$dvi_mode = 0;

$pdflatex = 'xelatex -synctex=1 -interaction=nonstopmode';
$makeindex = 'zhmakeindex -s zh.ist';