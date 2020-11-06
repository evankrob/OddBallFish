var isLayers = 0;
var isAll = 0;
var dom;

if (document.layers) {isLayers = 1}
if (document.all) {isAll = 1} 


docObj = (isLayers) ? 'document' : 'document.all'; 
styleObj = (isLayers) ? '' : '.style';
