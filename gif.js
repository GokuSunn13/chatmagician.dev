// --- DOM Elements ---
const frameInput = document.getElementById('frame_input');
const cropInput = document.getElementById('crop_input');
const addFrameBtn = document.getElementById('add_frame_btn');
const addCropBtn = document.getElementById('add_crop_btn');
const clearFramesBtn = document.getElementById('clear_frames_btn');
const framesList = document.getElementById('frames_list');
const gifPreviewCanvas = document.getElementById('gif_preview_canvas');
const playBtn = document.getElementById('play_btn');
const stopBtn = document.getElementById('stop_btn');
const frameCounter = document.getElementById('frame_counter');
const generateGifBtn = document.getElementById('generate_gif_btn');
const downloadGifBtn = document.getElementById('download_gif_btn');
const gifOutput = document.getElementById('gif_output');
const outputGif = document.getElementById('output_gif');

// Crop elements
const cropModal = document.getElementById('crop_modal');
const cropImage = document.getElementById('crop_image');
const cropBox = document.getElementById('crop_box');
const cropWrapper = document.getElementById('crop_wrapper');
const originalSizeSpan = document.getElementById('original_size');
const cropSizeSpan = document.getElementById('crop_size');
const cancelCropBtn = document.getElementById('cancel_crop_btn');
const cropAndAddBtn = document.getElementById('crop_and_add_btn');
const addWithoutCropBtn = document.getElementById('add_without_crop_btn');
const presetBtns = document.querySelectorAll('.preset_btn');

// Video elements
const videoInput = document.getElementById('video_input');
const addVideoBtn = document.getElementById('add_video_btn');
const videoSettings = document.getElementById('video_settings');
const videoPreview = document.getElementById('video_preview');
const videoStartInput = document.getElementById('video_start');
const videoEndInput = document.getElementById('video_end');
const videoExtractFpsInput = document.getElementById('video_extract_fps');
const estimatedFramesSpan = document.getElementById('estimated_frames');
const extractFramesBtn = document.getElementById('extract_frames_btn');
const cancelVideoBtn = document.getElementById('cancel_video_btn');
const extractionProgress = document.getElementById('extraction_progress');
const extractionFill = document.getElementById('extraction_fill');
const extractionText = document.getElementById('extraction_text');

// Settings inputs
const gifFpsInput = document.getElementById('gif_fps');
const gifWidthInput = document.getElementById('gif_width');
const gifHeightInput = document.getElementById('gif_height');
const gifQualityInput = document.getElementById('gif_quality');
const gifQualityValue = document.getElementById('gif_quality_value');
const gifLoopCheckbox = document.getElementById('gif_loop');

// --- Embedded GIF Worker Code (to avoid CORS issues) ---
const GIF_WORKER_CODE = `(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){var NeuQuant=require("./TypedNeuQuant.js");var LZWEncoder=require("./LZWEncoder.js");function ByteArray(){this.page=-1;this.pages=[];this.newPage()}ByteArray.pageSize=4096;ByteArray.charMap={};for(var i=0;i<256;i++)ByteArray.charMap[i]=String.fromCharCode(i);ByteArray.prototype.newPage=function(){this.pages[++this.page]=new Uint8Array(ByteArray.pageSize);this.cursor=0};ByteArray.prototype.getData=function(){var rv="";for(var p=0;p<this.pages.length;p++){for(var i=0;i<ByteArray.pageSize;i++){rv+=ByteArray.charMap[this.pages[p][i]]}}return rv};ByteArray.prototype.writeByte=function(val){if(this.cursor>=ByteArray.pageSize)this.newPage();this.pages[this.page][this.cursor++]=val};ByteArray.prototype.writeUTFBytes=function(string){for(var l=string.length,i=0;i<l;i++)this.writeByte(string.charCodeAt(i))};ByteArray.prototype.writeBytes=function(array,offset,length){for(var l=length||array.length,i=offset||0;i<l;i++)this.writeByte(array[i])};function GIFEncoder(width,height){this.width=~~width;this.height=~~height;this.transparent=null;this.transIndex=0;this.repeat=-1;this.delay=0;this.image=null;this.pixels=null;this.indexedPixels=null;this.colorDepth=null;this.colorTab=null;this.neuQuant=null;this.usedEntry=new Array;this.palSize=7;this.dispose=-1;this.firstFrame=true;this.sample=10;this.dither=false;this.globalPalette=false;this.out=new ByteArray}GIFEncoder.prototype.setDelay=function(milliseconds){this.delay=Math.round(milliseconds/10)};GIFEncoder.prototype.setFrameRate=function(fps){this.delay=Math.round(100/fps)};GIFEncoder.prototype.setDispose=function(disposalCode){if(disposalCode>=0)this.dispose=disposalCode};GIFEncoder.prototype.setRepeat=function(repeat){this.repeat=repeat};GIFEncoder.prototype.setTransparent=function(color){this.transparent=color};GIFEncoder.prototype.addFrame=function(imageData){this.image=imageData;this.colorTab=this.globalPalette&&this.globalPalette.slice?this.globalPalette:null;this.getImagePixels();this.analyzePixels();if(this.globalPalette===true)this.globalPalette=this.colorTab;if(this.firstFrame){this.writeLSD();this.writePalette();if(this.repeat>=0){this.writeNetscapeExt()}}this.writeGraphicCtrlExt();this.writeImageDesc();if(!this.firstFrame&&!this.globalPalette)this.writePalette();this.writePixels();this.firstFrame=false};GIFEncoder.prototype.finish=function(){this.out.writeByte(59)};GIFEncoder.prototype.setQuality=function(quality){if(quality<1)quality=1;this.sample=quality};GIFEncoder.prototype.setDither=function(dither){if(dither===true)dither="FloydSteinberg";this.dither=dither};GIFEncoder.prototype.setGlobalPalette=function(palette){this.globalPalette=palette};GIFEncoder.prototype.getGlobalPalette=function(){return this.globalPalette&&this.globalPalette.slice&&this.globalPalette.slice(0)||this.globalPalette};GIFEncoder.prototype.writeHeader=function(){this.out.writeUTFBytes("GIF89a")};GIFEncoder.prototype.analyzePixels=function(){if(!this.colorTab){this.neuQuant=new NeuQuant(this.pixels,this.sample);this.neuQuant.buildColormap();this.colorTab=this.neuQuant.getColormap()}if(this.dither){this.ditherPixels(this.dither.replace("-serpentine",""),this.dither.match(/-serpentine/)!==null)}else{this.indexPixels()}this.pixels=null;this.colorDepth=8;this.palSize=7;if(this.transparent!==null){this.transIndex=this.findClosest(this.transparent,true)}};GIFEncoder.prototype.indexPixels=function(imgq){var nPix=this.pixels.length/3;this.indexedPixels=new Uint8Array(nPix);var k=0;for(var j=0;j<nPix;j++){var index=this.findClosestRGB(this.pixels[k++]&255,this.pixels[k++]&255,this.pixels[k++]&255);this.usedEntry[index]=true;this.indexedPixels[j]=index}};GIFEncoder.prototype.ditherPixels=function(kernel,serpentine){var kernels={FalseFloydSteinberg:[[3/8,1,0],[3/8,0,1],[2/8,1,1]],FloydSteinberg:[[7/16,1,0],[3/16,-1,1],[5/16,0,1],[1/16,1,1]],Stucki:[[8/42,1,0],[4/42,2,0],[2/42,-2,1],[4/42,-1,1],[8/42,0,1],[4/42,1,1],[2/42,2,1],[1/42,-2,2],[2/42,-1,2],[4/42,0,2],[2/42,1,2],[1/42,2,2]],Atkinson:[[1/8,1,0],[1/8,2,0],[1/8,-1,1],[1/8,0,1],[1/8,1,1],[1/8,0,2]]};if(!kernel||!kernels[kernel]){throw"Unknown dithering kernel: "+kernel}var ds=kernels[kernel];var index=0,height=this.height,width=this.width,data=this.pixels;var direction=serpentine?-1:1;this.indexedPixels=new Uint8Array(this.pixels.length/3);for(var y=0;y<height;y++){if(serpentine)direction=direction*-1;for(var x=direction==1?0:width-1,xend=direction==1?width:0;x!==xend;x+=direction){index=y*width+x;var idx=index*3;var r1=data[idx];var g1=data[idx+1];var b1=data[idx+2];idx=this.findClosestRGB(r1,g1,b1);this.usedEntry[idx]=true;this.indexedPixels[index]=idx;idx*=3;var r2=this.colorTab[idx];var g2=this.colorTab[idx+1];var b2=this.colorTab[idx+2];var er=r1-r2;var eg=g1-g2;var eb=b1-b2;for(var i=direction==1?0:ds.length-1,end=direction==1?ds.length:0;i!==end;i+=direction){var x1=ds[i][1];var y1=ds[i][2];if(x1+x>=0&&x1+x<width&&y1+y>=0&&y1+y<height){var d=ds[i][0];idx=index+x1+y1*width;idx*=3;data[idx]=Math.max(0,Math.min(255,data[idx]+er*d));data[idx+1]=Math.max(0,Math.min(255,data[idx+1]+eg*d));data[idx+2]=Math.max(0,Math.min(255,data[idx+2]+eb*d))}}}}};GIFEncoder.prototype.findClosest=function(c,used){return this.findClosestRGB((c&16711680)>>16,(c&65280)>>8,c&255,used)};GIFEncoder.prototype.findClosestRGB=function(r,g,b,used){if(this.colorTab===null)return-1;if(this.neuQuant&&!used){return this.neuQuant.lookupRGB(r,g,b)}var c=b|g<<8|r<<16;var minpos=0;var dmin=256*256*256;var len=this.colorTab.length;for(var i=0,index=0;i<len;index++){var dr=r-(this.colorTab[i++]&255);var dg=g-(this.colorTab[i++]&255);var db=b-(this.colorTab[i++]&255);var d=dr*dr+dg*dg+db*db;if((!used||this.usedEntry[index])&&d<dmin){dmin=d;minpos=index}}return minpos};GIFEncoder.prototype.getImagePixels=function(){var w=this.width;var h=this.height;this.pixels=new Uint8Array(w*h*3);var data=this.image;var srcPos=0;var count=0;for(var i=0;i<h;i++){for(var j=0;j<w;j++){this.pixels[count++]=data[srcPos++];this.pixels[count++]=data[srcPos++];this.pixels[count++]=data[srcPos++];srcPos++}}};GIFEncoder.prototype.writeGraphicCtrlExt=function(){this.out.writeByte(33);this.out.writeByte(249);this.out.writeByte(4);var transp,disp;if(this.transparent===null){transp=0;disp=0}else{transp=1;disp=2}if(this.dispose>=0){disp=dispose&7}disp<<=2;this.out.writeByte(0|disp|0|transp);this.writeShort(this.delay);this.out.writeByte(this.transIndex);this.out.writeByte(0)};GIFEncoder.prototype.writeImageDesc=function(){this.out.writeByte(44);this.writeShort(0);this.writeShort(0);this.writeShort(this.width);this.writeShort(this.height);if(this.firstFrame||this.globalPalette){this.out.writeByte(0)}else{this.out.writeByte(128|0|0|0|this.palSize)}};GIFEncoder.prototype.writeLSD=function(){this.writeShort(this.width);this.writeShort(this.height);this.out.writeByte(128|112|0|this.palSize);this.out.writeByte(0);this.out.writeByte(0)};GIFEncoder.prototype.writeNetscapeExt=function(){this.out.writeByte(33);this.out.writeByte(255);this.out.writeByte(11);this.out.writeUTFBytes("NETSCAPE2.0");this.out.writeByte(3);this.out.writeByte(1);this.writeShort(this.repeat);this.out.writeByte(0)};GIFEncoder.prototype.writePalette=function(){this.out.writeBytes(this.colorTab);var n=3*256-this.colorTab.length;for(var i=0;i<n;i++)this.out.writeByte(0)};GIFEncoder.prototype.writeShort=function(pValue){this.out.writeByte(pValue&255);this.out.writeByte(pValue>>8&255)};GIFEncoder.prototype.writePixels=function(){var enc=new LZWEncoder(this.width,this.height,this.indexedPixels,this.colorDepth);enc.encode(this.out)};GIFEncoder.prototype.stream=function(){return this.out};module.exports=GIFEncoder},{"./LZWEncoder.js":2,"./TypedNeuQuant.js":3}],2:[function(require,module,exports){var EOF=-1;var BITS=12;var HSIZE=5003;var masks=[0,1,3,7,15,31,63,127,255,511,1023,2047,4095,8191,16383,32767,65535];function LZWEncoder(width,height,pixels,colorDepth){var initCodeSize=Math.max(2,colorDepth);var accum=new Uint8Array(256);var htab=new Int32Array(HSIZE);var codetab=new Int32Array(HSIZE);var cur_accum,cur_bits=0;var a_count;var free_ent=0;var maxcode;var clear_flg=false;var g_init_bits,ClearCode,EOFCode;function char_out(c,outs){accum[a_count++]=c;if(a_count>=254)flush_char(outs)}function cl_block(outs){cl_hash(HSIZE);free_ent=ClearCode+2;clear_flg=true;output(ClearCode,outs)}function cl_hash(hsize){for(var i=0;i<hsize;++i)htab[i]=-1}function compress(init_bits,outs){var fcode,c,i,ent,disp,hsize_reg,hshift;g_init_bits=init_bits;clear_flg=false;n_bits=g_init_bits;maxcode=MAXCODE(n_bits);ClearCode=1<<init_bits-1;EOFCode=ClearCode+1;free_ent=ClearCode+2;a_count=0;ent=nextPixel();hshift=0;for(fcode=HSIZE;fcode<65536;fcode*=2)++hshift;hshift=8-hshift;hsize_reg=HSIZE;cl_hash(hsize_reg);output(ClearCode,outs);outer_loop:while((c=nextPixel())!=EOF){fcode=(c<<BITS)+ent;i=c<<hshift^ent;if(htab[i]===fcode){ent=codetab[i];continue}else if(htab[i]>=0){disp=hsize_reg-i;if(i===0)disp=1;do{if((i-=disp)<0)i+=hsize_reg;if(htab[i]===fcode){ent=codetab[i];continue outer_loop}}while(htab[i]>=0)}output(ent,outs);ent=c;if(free_ent<1<<BITS){codetab[i]=free_ent++;htab[i]=fcode}else{cl_block(outs)}}output(ent,outs);output(EOFCode,outs)}function encode(outs){outs.writeByte(initCodeSize);remaining=width*height;curPixel=0;compress(initCodeSize+1,outs);outs.writeByte(0)}function flush_char(outs){if(a_count>0){outs.writeByte(a_count);outs.writeBytes(accum,0,a_count);a_count=0}}function MAXCODE(n_bits){return(1<<n_bits)-1}function nextPixel(){if(remaining===0)return EOF;--remaining;var pix=pixels[curPixel++];return pix&255}function output(code,outs){cur_accum&=masks[cur_bits];if(cur_bits>0)cur_accum|=code<<cur_bits;else cur_accum=code;cur_bits+=n_bits;while(cur_bits>=8){char_out(cur_accum&255,outs);cur_accum>>=8;cur_bits-=8}if(free_ent>maxcode||clear_flg){if(clear_flg){maxcode=MAXCODE(n_bits=g_init_bits);clear_flg=false}else{++n_bits;if(n_bits==BITS)maxcode=1<<BITS;else maxcode=MAXCODE(n_bits)}}if(code==EOFCode){while(cur_bits>0){char_out(cur_accum&255,outs);cur_accum>>=8;cur_bits-=8}flush_char(outs)}}this.encode=encode}module.exports=LZWEncoder},{}],3:[function(require,module,exports){var ncycles=100;var netsize=256;var maxnetpos=netsize-1;var netbiasshift=4;var intbiasshift=16;var intbias=1<<intbiasshift;var gammashift=10;var gamma=1<<gammashift;var betashift=10;var beta=intbias>>betashift;var betagamma=intbias<<gammashift-betashift;var initrad=netsize>>3;var radiusbiasshift=6;var radiusbias=1<<radiusbiasshift;var initradius=initrad*radiusbias;var radiusdec=30;var alphabiasshift=10;var initalpha=1<<alphabiasshift;var alphadec;var radbiasshift=8;var radbias=1<<radbiasshift;var alpharadbshift=alphabiasshift+radbiasshift;var alpharadbias=1<<alpharadbshift;var prime1=499;var prime2=491;var prime3=487;var prime4=503;var minpicturebytes=3*prime4;function NeuQuant(pixels,samplefac){var network;var netindex;var bias;var freq;var radpower;function init(){network=[];netindex=new Int32Array(256);bias=new Int32Array(netsize);freq=new Int32Array(netsize);radpower=new Int32Array(netsize>>3);var i,v;for(i=0;i<netsize;i++){v=(i<<netbiasshift+8)/netsize;network[i]=new Float64Array([v,v,v,0]);freq[i]=intbias/netsize;bias[i]=0}}function unbiasnet(){for(var i=0;i<netsize;i++){network[i][0]>>=netbiasshift;network[i][1]>>=netbiasshift;network[i][2]>>=netbiasshift;network[i][3]=i}}function altersingle(alpha,i,b,g,r){network[i][0]-=alpha*(network[i][0]-b)/initalpha;network[i][1]-=alpha*(network[i][1]-g)/initalpha;network[i][2]-=alpha*(network[i][2]-r)/initalpha}function alterneigh(radius,i,b,g,r){var lo=Math.abs(i-radius);var hi=Math.min(i+radius,netsize);var j=i+1;var k=i-1;var m=1;var p,a;while(j<hi||k>lo){a=radpower[m++];if(j<hi){p=network[j++];p[0]-=a*(p[0]-b)/alpharadbias;p[1]-=a*(p[1]-g)/alpharadbias;p[2]-=a*(p[2]-r)/alpharadbias}if(k>lo){p=network[k--];p[0]-=a*(p[0]-b)/alpharadbias;p[1]-=a*(p[1]-g)/alpharadbias;p[2]-=a*(p[2]-r)/alpharadbias}}}function contest(b,g,r){var bestd=~(1<<31);var bestbiasd=bestd;var bestpos=-1;var bestbiaspos=bestpos;var i,n,dist,biasdist,betafreq;for(i=0;i<netsize;i++){n=network[i];dist=Math.abs(n[0]-b)+Math.abs(n[1]-g)+Math.abs(n[2]-r);if(dist<bestd){bestd=dist;bestpos=i}biasdist=dist-(bias[i]>>intbiasshift-netbiasshift);if(biasdist<bestbiasd){bestbiasd=biasdist;bestbiaspos=i}betafreq=freq[i]>>betashift;freq[i]-=betafreq;bias[i]+=betafreq<<gammashift}freq[bestpos]+=beta;bias[bestpos]-=betagamma;return bestbiaspos}function inxbuild(){var i,j,p,q,smallpos,smallval,previouscol=0,startpos=0;for(i=0;i<netsize;i++){p=network[i];smallpos=i;smallval=p[1];for(j=i+1;j<netsize;j++){q=network[j];if(q[1]<smallval){smallpos=j;smallval=q[1]}}q=network[smallpos];if(i!=smallpos){j=q[0];q[0]=p[0];p[0]=j;j=q[1];q[1]=p[1];p[1]=j;j=q[2];q[2]=p[2];p[2]=j;j=q[3];q[3]=p[3];p[3]=j}if(smallval!=previouscol){netindex[previouscol]=startpos+i>>1;for(j=previouscol+1;j<smallval;j++)netindex[j]=i;previouscol=smallval;startpos=i}}netindex[previouscol]=startpos+maxnetpos>>1;for(j=previouscol+1;j<256;j++)netindex[j]=maxnetpos}function inxsearch(b,g,r){var a,p,dist;var bestd=1e3;var best=-1;var i=netindex[g];var j=i-1;while(i<netsize||j>=0){if(i<netsize){p=network[i];dist=p[1]-g;if(dist>=bestd)i=netsize;else{i++;if(dist<0)dist=-dist;a=p[0]-b;if(a<0)a=-a;dist+=a;if(dist<bestd){a=p[2]-r;if(a<0)a=-a;dist+=a;if(dist<bestd){bestd=dist;best=p[3]}}}}if(j>=0){p=network[j];dist=g-p[1];if(dist>=bestd)j=-1;else{j--;if(dist<0)dist=-dist;a=p[0]-b;if(a<0)a=-a;dist+=a;if(dist<bestd){a=p[2]-r;if(a<0)a=-a;dist+=a;if(dist<bestd){bestd=dist;best=p[3]}}}}}return best}function learn(){var i;var lengthcount=pixels.length;var alphadec=30+(samplefac-1)/3;var samplepixels=lengthcount/(3*samplefac);var delta=~~(samplepixels/ncycles);var alpha=initalpha;var radius=initradius;var rad=radius>>radiusbiasshift;if(rad<=1)rad=0;for(i=0;i<rad;i++)radpower[i]=alpha*((rad*rad-i*i)*radbias/(rad*rad));var step;if(lengthcount<minpicturebytes){samplefac=1;step=3}else if(lengthcount%prime1!==0){step=3*prime1}else if(lengthcount%prime2!==0){step=3*prime2}else if(lengthcount%prime3!==0){step=3*prime3}else{step=3*prime4}var b,g,r,j;var pix=0;i=0;while(i<samplepixels){b=(pixels[pix]&255)<<netbiasshift;g=(pixels[pix+1]&255)<<netbiasshift;r=(pixels[pix+2]&255)<<netbiasshift;j=contest(b,g,r);altersingle(alpha,j,b,g,r);if(rad!==0)alterneigh(rad,j,b,g,r);pix+=step;if(pix>=lengthcount)pix-=lengthcount;i++;if(delta===0)delta=1;if(i%delta===0){alpha-=alpha/alphadec;radius-=radius/radiusdec;rad=radius>>radiusbiasshift;if(rad<=1)rad=0;for(j=0;j<rad;j++)radpower[j]=alpha*((rad*rad-j*j)*radbias/(rad*rad))}}}function buildColormap(){init();learn();unbiasnet();inxbuild()}this.buildColormap=buildColormap;function getColormap(){var map=[];var index=[];for(var i=0;i<netsize;i++)index[network[i][3]]=i;var k=0;for(var l=0;l<netsize;l++){var j=index[l];map[k++]=network[j][0];map[k++]=network[j][1];map[k++]=network[j][2]}return map}this.getColormap=getColormap;this.lookupRGB=inxsearch}module.exports=NeuQuant},{}],4:[function(require,module,exports){var GIFEncoder,renderFrame;GIFEncoder=require("./GIFEncoder.js");renderFrame=function(frame){var encoder,page,stream,transfer;encoder=new GIFEncoder(frame.width,frame.height);if(frame.index===0){encoder.writeHeader()}else{encoder.firstFrame=false}encoder.setTransparent(frame.transparent);encoder.setRepeat(frame.repeat);encoder.setDelay(frame.delay);encoder.setQuality(frame.quality);encoder.setDither(frame.dither);encoder.setGlobalPalette(frame.globalPalette);encoder.addFrame(frame.data);if(frame.last){encoder.finish()}if(frame.globalPalette===true){frame.globalPalette=encoder.getGlobalPalette()}stream=encoder.stream();frame.data=stream.pages;frame.cursor=stream.cursor;frame.pageSize=stream.constructor.pageSize;if(frame.canTransfer){transfer=function(){var i,len,ref,results;ref=frame.data;results=[];for(i=0,len=ref.length;i<len;i++){page=ref[i];results.push(page.buffer)}return results}();return self.postMessage(frame,transfer)}else{return self.postMessage(frame)}};self.onmessage=function(event){return renderFrame(event.data)}},{"./GIFEncoder.js":1}]},{},[4]);`;

// Create worker blob URL from embedded code
const workerBlob = new Blob([GIF_WORKER_CODE], { type: 'application/javascript' });
const workerBlobURL = URL.createObjectURL(workerBlob);

// --- State ---
let frames = []; // Array of { id, img, duration }
let frameIdCounter = 0;
let isPlaying = false;
let playInterval = null;
let currentFrameIndex = 0;
let generatedGifBlob = null;
let currentVideoFile = null;
let isExtracting = false;

// Crop state
let cropState = {
    images: [], // Queue of images to crop
    currentIndex: 0,
    originalImage: null,
    scale: 1,
    aspectRatio: null, // null = free, otherwise number like 16/9
    isDragging: false,
    isResizing: false,
    resizeHandle: null,
    startX: 0,
    startY: 0,
    startCrop: { x: 0, y: 0, width: 0, height: 0 },
    crop: { x: 0, y: 0, width: 0, height: 0 }
};

const ctx = gifPreviewCanvas.getContext('2d');

// --- Functions ---

function updateFramesList() {
    if (frames.length === 0) {
        framesList.innerHTML = `
            <div class="empty_frames">
                <span>📷</span>
                <p>Dodaj obrazy lub wideo, aby rozpocząć</p>
                <small>Przeciągnij i upuść lub kliknij przyciski powyżej</small>
            </div>
        `;
        generateGifBtn.disabled = true;
        playBtn.disabled = true;
        stopBtn.disabled = true;
    } else {
        framesList.innerHTML = '';
        frames.forEach((frame, index) => {
            const frameItem = document.createElement('div');
            frameItem.className = 'frame_item' + (index === currentFrameIndex ? ' selected' : '');
            frameItem.draggable = true;
            frameItem.dataset.id = frame.id;
            frameItem.innerHTML = `
                <img src="${frame.img.src}" alt="Frame ${index + 1}">
                <span class="frame_number">${index + 1}</span>
                <button class="frame_delete" data-id="${frame.id}">×</button>
            `;
            
            // Click to select frame
            frameItem.addEventListener('click', (e) => {
                if (!e.target.classList.contains('frame_delete')) {
                    currentFrameIndex = index;
                    updateFramesList();
                    drawFrame(index);
                }
            });
            
            // Drag events for reordering
            frameItem.addEventListener('dragstart', handleDragStart);
            frameItem.addEventListener('dragover', handleDragOver);
            frameItem.addEventListener('drop', handleDrop);
            frameItem.addEventListener('dragend', handleDragEnd);
            
            framesList.appendChild(frameItem);
        });
        
        generateGifBtn.disabled = false;
        playBtn.disabled = false;
        stopBtn.disabled = false;
        
        // Add delete listeners
        document.querySelectorAll('.frame_delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                removeFrame(parseInt(e.target.dataset.id));
            });
        });
    }
    
    updateFrameCounter();
}

function addFrame(img) {
    const id = ++frameIdCounter;
    frames.push({
        id,
        img,
        duration: 1000 / parseInt(gifFpsInput.value) // ms per frame
    });
    updateFramesList();
    
    // If this is the first frame, draw it
    if (frames.length === 1) {
        resizeCanvas();
        drawFrame(0);
    }
}

function removeFrame(id) {
    const index = frames.findIndex(f => f.id === id);
    if (index !== -1) {
        frames.splice(index, 1);
        if (currentFrameIndex >= frames.length) {
            currentFrameIndex = Math.max(0, frames.length - 1);
        }
        updateFramesList();
        if (frames.length > 0) {
            drawFrame(currentFrameIndex);
        } else {
            clearCanvas();
        }
    }
}

function clearAllFrames() {
    frames = [];
    frameIdCounter = 0;
    currentFrameIndex = 0;
    generatedGifBlob = null;
    downloadGifBtn.disabled = true;
    gifOutput.style.display = 'none';
    updateFramesList();
    clearCanvas();
}

function resizeCanvas() {
    const width = parseInt(gifWidthInput.value) || 400;
    const height = parseInt(gifHeightInput.value) || 300;
    gifPreviewCanvas.width = width;
    gifPreviewCanvas.height = height;
}

function clearCanvas() {
    resizeCanvas();
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, gifPreviewCanvas.width, gifPreviewCanvas.height);
}

function drawFrame(index) {
    if (index < 0 || index >= frames.length) return;
    
    const frame = frames[index];
    const canvasW = gifPreviewCanvas.width;
    const canvasH = gifPreviewCanvas.height;
    
    // Clear canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvasW, canvasH);
    
    // Calculate aspect-fit scaling
    const imgW = frame.img.width;
    const imgH = frame.img.height;
    const scale = Math.min(canvasW / imgW, canvasH / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;
    const drawX = (canvasW - drawW) / 2;
    const drawY = (canvasH - drawH) / 2;
    
    ctx.drawImage(frame.img, drawX, drawY, drawW, drawH);
    currentFrameIndex = index;
    updateFrameCounter();
}

function updateFrameCounter() {
    frameCounter.textContent = `Klatka: ${frames.length > 0 ? currentFrameIndex + 1 : 0} / ${frames.length}`;
}

function playPreview() {
    if (frames.length === 0) return;
    
    stopPreview();
    isPlaying = true;
    playBtn.textContent = '⏸️ Pauza';
    
    const fps = parseInt(gifFpsInput.value) || 10;
    const delay = 1000 / fps;
    
    playInterval = setInterval(() => {
        currentFrameIndex = (currentFrameIndex + 1) % frames.length;
        drawFrame(currentFrameIndex);
        updateFramesList();
    }, delay);
}

function stopPreview() {
    isPlaying = false;
    playBtn.textContent = '▶️ Odtwórz';
    if (playInterval) {
        clearInterval(playInterval);
        playInterval = null;
    }
}

function togglePlay() {
    if (isPlaying) {
        stopPreview();
    } else {
        playPreview();
    }
}

async function generateGif() {
    if (frames.length === 0) return;
    
    stopPreview();
    generateGifBtn.disabled = true;
    generateGifBtn.textContent = '⏳ Generowanie...';
    
    const width = parseInt(gifWidthInput.value) || 400;
    const height = parseInt(gifHeightInput.value) || 300;
    const quality = parseInt(gifQualityInput.value) || 10;
    const fps = parseInt(gifFpsInput.value) || 10;
    const loop = gifLoopCheckbox.checked;
    
    try {
        const gif = new GIF({
            workers: 2,
            quality: quality,
            width: width,
            height: height,
            workerScript: workerBlobURL
        });
        
        // Create temporary canvas for rendering frames
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Add each frame
        frames.forEach(frame => {
            // Clear temp canvas
            tempCtx.fillStyle = '#000';
            tempCtx.fillRect(0, 0, width, height);
            
            // Calculate aspect-fit scaling
            const imgW = frame.img.width;
            const imgH = frame.img.height;
            const scale = Math.min(width / imgW, height / imgH);
            const drawW = imgW * scale;
            const drawH = imgH * scale;
            const drawX = (width - drawW) / 2;
            const drawY = (height - drawH) / 2;
            
            tempCtx.drawImage(frame.img, drawX, drawY, drawW, drawH);
            
            gif.addFrame(tempCtx, {
                copy: true,
                delay: Math.round(1000 / fps)
            });
        });
        
        gif.on('finished', function(blob) {
            generatedGifBlob = blob;
            const url = URL.createObjectURL(blob);
            outputGif.src = url;
            gifOutput.style.display = 'block';
            downloadGifBtn.disabled = false;
            
            generateGifBtn.disabled = false;
            generateGifBtn.textContent = '🎬 Generuj GIF';
        });
        
        gif.on('progress', function(p) {
            generateGifBtn.textContent = `⏳ ${Math.round(p * 100)}%`;
        });
        
        gif.render();
        
    } catch (error) {
        console.error('Error generating GIF:', error);
        alert('Błąd podczas generowania GIF: ' + error.message);
        generateGifBtn.disabled = false;
        generateGifBtn.textContent = '🎬 Generuj GIF';
    }
}

function downloadGif() {
    if (!generatedGifBlob) return;
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(generatedGifBlob);
    link.download = 'animation.gif';
    link.click();
}

// --- Drag and Drop for reordering ---
let draggedItem = null;

function handleDragStart(e) {
    draggedItem = this;
    this.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e) {
    e.preventDefault();
    if (draggedItem !== this) {
        const draggedId = parseInt(draggedItem.dataset.id);
        const targetId = parseInt(this.dataset.id);
        
        const draggedIndex = frames.findIndex(f => f.id === draggedId);
        const targetIndex = frames.findIndex(f => f.id === targetId);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
            // Swap frames
            const [removed] = frames.splice(draggedIndex, 1);
            frames.splice(targetIndex, 0, removed);
            updateFramesList();
        }
    }
}

function handleDragEnd() {
    this.style.opacity = '1';
    draggedItem = null;
}

// --- Drag and Drop for adding files ---
framesList.addEventListener('dragover', (e) => {
    e.preventDefault();
    framesList.classList.add('drag-over');
});

framesList.addEventListener('dragleave', () => {
    framesList.classList.remove('drag-over');
});

framesList.addEventListener('drop', (e) => {
    e.preventDefault();
    framesList.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    handleFiles(files);
});

function handleFiles(files) {
    Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = function(ev) {
                const img = new Image();
                img.onload = function() {
                    addFrame(img);
                };
                img.src = ev.target.result;
            };
            reader.readAsDataURL(file);
        } else if (file.type.startsWith('video/')) {
            handleVideoFile(file);
        }
    });
}

// --- Video Functions ---
function handleVideoFile(file) {
    currentVideoFile = file;
    const url = URL.createObjectURL(file);
    videoPreview.src = url;
    
    videoPreview.onloadedmetadata = function() {
        const duration = videoPreview.duration;
        videoStartInput.value = 0;
        videoStartInput.max = duration;
        videoEndInput.value = Math.min(5, duration);
        videoEndInput.max = duration;
        updateEstimatedFrames();
        videoSettings.style.display = 'block';
    };
}

function updateEstimatedFrames() {
    const start = parseFloat(videoStartInput.value) || 0;
    const end = parseFloat(videoEndInput.value) || 5;
    const fps = parseInt(videoExtractFpsInput.value) || 10;
    const duration = Math.max(0, end - start);
    const estimatedCount = Math.ceil(duration * fps);
    estimatedFramesSpan.textContent = `~${estimatedCount} klatek`;
}

function cancelVideoExtraction() {
    videoSettings.style.display = 'none';
    videoPreview.src = '';
    currentVideoFile = null;
    isExtracting = false;
}

async function extractFramesFromVideo() {
    if (!currentVideoFile || isExtracting) return;
    
    isExtracting = true;
    extractFramesBtn.disabled = true;
    extractionProgress.style.display = 'block';
    
    const start = parseFloat(videoStartInput.value) || 0;
    const end = parseFloat(videoEndInput.value) || 5;
    const fps = parseInt(videoExtractFpsInput.value) || 10;
    const duration = Math.max(0, end - start);
    const frameInterval = 1 / fps;
    const totalFrames = Math.ceil(duration * fps);
    
    // Create a temporary video element for seeking
    const video = document.createElement('video');
    video.src = URL.createObjectURL(currentVideoFile);
    video.muted = true;
    
    // Create temporary canvas for extracting frames
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    await new Promise(resolve => {
        video.onloadedmetadata = resolve;
    });
    
    tempCanvas.width = video.videoWidth;
    tempCanvas.height = video.videoHeight;
    
    // Update output size to match video aspect ratio if this is first content
    if (frames.length === 0) {
        gifWidthInput.value = Math.min(video.videoWidth, 600);
        const aspectRatio = video.videoHeight / video.videoWidth;
        gifHeightInput.value = Math.round(parseInt(gifWidthInput.value) * aspectRatio);
        gifFpsInput.value = fps;
        resizeCanvas();
    }
    
    let extractedCount = 0;
    
    for (let time = start; time < end && isExtracting; time += frameInterval) {
        // Seek to time
        video.currentTime = time;
        
        await new Promise(resolve => {
            video.onseeked = resolve;
        });
        
        // Draw frame to canvas
        tempCtx.drawImage(video, 0, 0);
        
        // Convert to image
        const dataUrl = tempCanvas.toDataURL('image/jpeg', 0.9);
        const img = new Image();
        
        await new Promise(resolve => {
            img.onload = resolve;
            img.src = dataUrl;
        });
        
        addFrame(img);
        extractedCount++;
        
        // Update progress
        const progress = Math.round((extractedCount / totalFrames) * 100);
        extractionFill.style.width = progress + '%';
        extractionText.textContent = `Ekstrakcja: ${progress}% (${extractedCount}/${totalFrames})`;
    }
    
    // Cleanup
    URL.revokeObjectURL(video.src);
    isExtracting = false;
    extractFramesBtn.disabled = false;
    extractionProgress.style.display = 'none';
    extractionFill.style.width = '0%';
    videoSettings.style.display = 'none';
    videoPreview.src = '';
    currentVideoFile = null;
    
    // Draw first frame
    if (frames.length > 0) {
        drawFrame(0);
    }
}

// --- Event Listeners ---

addFrameBtn.addEventListener('click', () => frameInput.click());
addCropBtn.addEventListener('click', () => cropInput.click());
addVideoBtn.addEventListener('click', () => videoInput.click());

frameInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
    frameInput.value = ''; // Reset to allow adding same files again
});

cropInput.addEventListener('change', (e) => {
    handleCropFiles(e.target.files);
    cropInput.value = '';
});

videoInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleVideoFile(e.target.files[0]);
    }
    videoInput.value = '';
});

// --- Crop Functions ---

function handleCropFiles(files) {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    
    cropState.images = [];
    cropState.currentIndex = 0;
    
    // Load all images
    let loadedCount = 0;
    imageFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(ev) {
            const img = new Image();
            img.onload = function() {
                cropState.images[index] = img;
                loadedCount++;
                if (loadedCount === imageFiles.length) {
                    // All loaded, start cropping
                    openCropModal(0);
                }
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function openCropModal(index) {
    if (index >= cropState.images.length) {
        closeCropModal();
        return;
    }
    
    cropState.currentIndex = index;
    cropState.originalImage = cropState.images[index];
    
    cropImage.src = cropState.originalImage.src;
    cropImage.onload = function() {
        // Calculate scale (how much the displayed image is scaled)
        cropState.scale = cropImage.naturalWidth / cropImage.width;
        
        // Initialize crop to full image
        cropState.crop = {
            x: 0,
            y: 0,
            width: cropImage.width,
            height: cropImage.height
        };
        
        updateCropBox();
        updateCropInfo();
    };
    
    originalSizeSpan.textContent = `Oryginał: ${cropState.originalImage.width} x ${cropState.originalImage.height}`;
    cropModal.style.display = 'flex';
    
    // Reset aspect ratio to free
    cropState.aspectRatio = null;
    presetBtns.forEach(btn => btn.classList.remove('active'));
    document.querySelector('.preset_btn[data-ratio="free"]').classList.add('active');
}

function closeCropModal() {
    cropModal.style.display = 'none';
    cropState.images = [];
    cropState.currentIndex = 0;
    cropState.originalImage = null;
}

function updateCropBox() {
    const { x, y, width, height } = cropState.crop;
    cropBox.style.left = x + 'px';
    cropBox.style.top = y + 'px';
    cropBox.style.width = width + 'px';
    cropBox.style.height = height + 'px';
}

function updateCropInfo() {
    const realWidth = Math.round(cropState.crop.width * cropState.scale);
    const realHeight = Math.round(cropState.crop.height * cropState.scale);
    cropSizeSpan.textContent = `Zaznaczenie: ${realWidth} x ${realHeight}`;
}

function constrainCrop() {
    const imgWidth = cropImage.width;
    const imgHeight = cropImage.height;
    
    // Ensure minimum size
    cropState.crop.width = Math.max(50, cropState.crop.width);
    cropState.crop.height = Math.max(50, cropState.crop.height);
    
    // Constrain to image bounds
    cropState.crop.x = Math.max(0, Math.min(cropState.crop.x, imgWidth - cropState.crop.width));
    cropState.crop.y = Math.max(0, Math.min(cropState.crop.y, imgHeight - cropState.crop.height));
    cropState.crop.width = Math.min(cropState.crop.width, imgWidth - cropState.crop.x);
    cropState.crop.height = Math.min(cropState.crop.height, imgHeight - cropState.crop.y);
}

function applyAspectRatio(keepWidth = true) {
    if (!cropState.aspectRatio) return;
    
    const imgWidth = cropImage.width;
    const imgHeight = cropImage.height;
    
    if (keepWidth) {
        cropState.crop.height = cropState.crop.width / cropState.aspectRatio;
    } else {
        cropState.crop.width = cropState.crop.height * cropState.aspectRatio;
    }
    
    // Make sure it fits
    if (cropState.crop.width > imgWidth) {
        cropState.crop.width = imgWidth;
        cropState.crop.height = cropState.crop.width / cropState.aspectRatio;
    }
    if (cropState.crop.height > imgHeight) {
        cropState.crop.height = imgHeight;
        cropState.crop.width = cropState.crop.height * cropState.aspectRatio;
    }
    
    constrainCrop();
}

function setAspectRatio(ratio) {
    presetBtns.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (ratio === 'free') {
        cropState.aspectRatio = null;
    } else {
        const [w, h] = ratio.split(':').map(Number);
        cropState.aspectRatio = w / h;
        applyAspectRatio(true);
        updateCropBox();
        updateCropInfo();
    }
}

function cropAndAddImage() {
    const { x, y, width, height } = cropState.crop;
    const scale = cropState.scale;
    
    // Create canvas for cropped image
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    
    // Draw cropped portion
    ctx.drawImage(
        cropState.originalImage,
        Math.round(x * scale), Math.round(y * scale),
        canvas.width, canvas.height,
        0, 0,
        canvas.width, canvas.height
    );
    
    // Create image from canvas
    const img = new Image();
    img.onload = function() {
        addFrame(img);
        
        // Move to next image or close
        if (cropState.currentIndex < cropState.images.length - 1) {
            openCropModal(cropState.currentIndex + 1);
        } else {
            closeCropModal();
        }
    };
    img.src = canvas.toDataURL('image/png');
}

function addWithoutCrop() {
    addFrame(cropState.originalImage);
    
    // Move to next image or close
    if (cropState.currentIndex < cropState.images.length - 1) {
        openCropModal(cropState.currentIndex + 1);
    } else {
        closeCropModal();
    }
}

// Crop box mouse/touch interactions
cropBox.addEventListener('mousedown', startDrag);
cropBox.addEventListener('touchstart', startDrag, { passive: false });

document.querySelectorAll('.crop_handle').forEach(handle => {
    handle.addEventListener('mousedown', startResize);
    handle.addEventListener('touchstart', startResize, { passive: false });
});

document.addEventListener('mousemove', handleDrag);
document.addEventListener('touchmove', handleDrag, { passive: false });

document.addEventListener('mouseup', stopDrag);
document.addEventListener('touchend', stopDrag);

function getEventPos(e) {
    if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
}

function startDrag(e) {
    if (e.target.classList.contains('crop_handle')) return;
    e.preventDefault();
    
    const pos = getEventPos(e);
    cropState.isDragging = true;
    cropState.startX = pos.x;
    cropState.startY = pos.y;
    cropState.startCrop = { ...cropState.crop };
}

function startResize(e) {
    e.preventDefault();
    e.stopPropagation();
    
    const pos = getEventPos(e);
    cropState.isResizing = true;
    cropState.resizeHandle = e.target.dataset.handle;
    cropState.startX = pos.x;
    cropState.startY = pos.y;
    cropState.startCrop = { ...cropState.crop };
}

function handleDrag(e) {
    if (!cropState.isDragging && !cropState.isResizing) return;
    e.preventDefault();
    
    const pos = getEventPos(e);
    const dx = pos.x - cropState.startX;
    const dy = pos.y - cropState.startY;
    
    if (cropState.isDragging) {
        cropState.crop.x = cropState.startCrop.x + dx;
        cropState.crop.y = cropState.startCrop.y + dy;
        constrainCrop();
    } else if (cropState.isResizing) {
        const handle = cropState.resizeHandle;
        let newCrop = { ...cropState.startCrop };
        
        // Handle resize based on which handle is being dragged
        if (handle.includes('e')) {
            newCrop.width = cropState.startCrop.width + dx;
        }
        if (handle.includes('w')) {
            newCrop.x = cropState.startCrop.x + dx;
            newCrop.width = cropState.startCrop.width - dx;
        }
        if (handle.includes('s')) {
            newCrop.height = cropState.startCrop.height + dy;
        }
        if (handle.includes('n')) {
            newCrop.y = cropState.startCrop.y + dy;
            newCrop.height = cropState.startCrop.height - dy;
        }
        
        // Apply aspect ratio if set
        if (cropState.aspectRatio) {
            if (handle.includes('e') || handle.includes('w')) {
                newCrop.height = newCrop.width / cropState.aspectRatio;
            } else {
                newCrop.width = newCrop.height * cropState.aspectRatio;
            }
        }
        
        cropState.crop = newCrop;
        constrainCrop();
    }
    
    updateCropBox();
    updateCropInfo();
}

function stopDrag() {
    cropState.isDragging = false;
    cropState.isResizing = false;
    cropState.resizeHandle = null;
}

// Preset buttons
presetBtns.forEach(btn => {
    btn.addEventListener('click', () => setAspectRatio(btn.dataset.ratio));
});

// Crop action buttons
cancelCropBtn.addEventListener('click', closeCropModal);
cropAndAddBtn.addEventListener('click', cropAndAddImage);
addWithoutCropBtn.addEventListener('click', addWithoutCrop);

clearFramesBtn.addEventListener('click', clearAllFrames);
cancelVideoBtn.addEventListener('click', cancelVideoExtraction);
extractFramesBtn.addEventListener('click', extractFramesFromVideo);

// Video settings change listeners
videoStartInput.addEventListener('input', updateEstimatedFrames);
videoEndInput.addEventListener('input', updateEstimatedFrames);
videoExtractFpsInput.addEventListener('input', updateEstimatedFrames);

playBtn.addEventListener('click', togglePlay);
stopBtn.addEventListener('click', stopPreview);

generateGifBtn.addEventListener('click', generateGif);
downloadGifBtn.addEventListener('click', downloadGif);

// Settings changes
gifFpsInput.addEventListener('change', () => {
    stopPreview();
});

gifWidthInput.addEventListener('change', () => {
    resizeCanvas();
    if (frames.length > 0) {
        drawFrame(currentFrameIndex);
    }
});

gifHeightInput.addEventListener('change', () => {
    resizeCanvas();
    if (frames.length > 0) {
        drawFrame(currentFrameIndex);
    }
});

gifQualityInput.addEventListener('input', function() {
    gifQualityValue.textContent = this.value;
});

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    resizeCanvas();
    clearCanvas();
    updateFramesList();
});
