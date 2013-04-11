define([
        'config',
        'jquery',
        'inputController',
        'sectionController',
        'stageReference',
        'effects/Fold',
        'mout/function/bind',
        'mout/array/indexOf',
        'EKTweener'
    ], function(config, $, inputController, sectionController, stageReference, Fold, bind, indexOf, EKTweener){

        var undef;

        function FoldListItem(elem, onPeekCallback, onUnPeekCallback, onOpenCallback, shaderPadding){
            this.elem = elem;
            this.onPeekCallback = onPeekCallback;
            this.onUnPeekCallback = onUnPeekCallback;
            this.onOpenCallback = onOpenCallback;
            this.shaderPadding = shaderPadding;

            this._init();
        }

        var _p = FoldListItem.prototype;

        var needRenderItems = FoldListItem.needRenderItems = [];

        var _isDownItems = [];
        var _isInitialized = false;

        var _transform3DStyle = config.transform3DStyle;
        var _filterStyle = config.filterStyle;

        function _init(){
            this.elemStyle = this.elem.style;
            this.$elem = $(this.elem);

            // Create the shadow div
            var shadow = $('<div>').css({
                display: 'none',
                position: 'absolute',
                left: 0,
                right: 0,
                borderTop: this.shaderPadding + 'px solid transparent',
                borderBottom: this.shaderPadding + 'px solid rgba(0,0,0,.3)',
                pointerEvents: 'none',
                zIndex: this.$elem.children().length + 100
            });

            this.$elem.append(shadow);

            this.shadowStyle = shadow[0].style;
            this.fold = new Fold({padding_height : this.shaderPadding});
            this.foldParams = this.fold.params;

            inputController.add(this.elem, 'down', bind(_onItemDown, this));

            if(!_isInitialized) {
                inputController.onMove.add(_onItemMove);
                inputController.onUp.add(_onItemUp);
                stageReference.onRender.add(_renderAll);
                _isInitialized = true;
            }
        }

        function _onItemDown(e){
            if(sectionController.isAnimating() || indexOf(_isDownItems, this) > -1) return;
            _isDownItems.push(this);
            this.updateSize();
            this.foldParams.down_x = e.x / this.foldParams.width - this.foldParams.distance;
        }

        function _setRender(){
            var shaderStyle = this.shadowStyle;
            if(indexOf(needRenderItems, this) > -1 && shaderStyle.display == 'block') return;
            var params = this.fold.params;
            shaderStyle.display = 'block';
            shaderStyle.top = shaderStyle.bottom =  '-' + params.margin_height + 'px';
            this.elemStyle.zIndex = this.$elem.siblings().length + 100;
            if(params.distance === 0.0) {
                params.distance = 0.00001;
            } else if(params.distance ===1.0) {
                params.distance = 0.99999;
            }
            this.render();
            this.render();
            needRenderItems.push(this);
        }

        function resetShader(){
            var index = indexOf(needRenderItems, this);
            if(index > -1) needRenderItems.splice(index, 1);
            this.shadowStyle.display = 'none';
            this.foldParams.distance = 0;
            this.elemStyle[_transform3DStyle] = 'translateZ(0)';
            this.elemStyle[_filterStyle] = 'none';
            this.elemStyle.zIndex = 'auto';
            this.hasPeeked = false;
        }

        function setTo(distance, downX){
            EKTweener.killTweensOf(this.foldParams);
            this.foldParams.distance = distance;
            if(downX !== undef) this.foldParams.down_x = downX;
            this._setRender();
        }

        function easeTo(distance, downX, duration){
            EKTweener.to(this.foldParams, duration, {distance: distance, down_x: downX, ease: 'easeInOutSine'});
            this._setRender();
        }

        function updateSize() {
            var params = this.foldParams;
            var itemWidth = this.$elem.width();
            var itemHeight = this.$elem.height();
            var segY = Math.ceil(itemHeight / this.shaderPadding) + 2;
            this.fold.updateHeader({segY: segY});
            params.width = itemWidth;
            params.height = itemHeight;
            params.padding_height = 1 / segY;
            params.margin_height = (segY * this.shaderPadding - itemHeight) / 2 / segY / params.padding_height;
        }

        function render(){
            var params = this.foldParams;
            if(this.renderToggle ^= 1) {
                this.elemStyle[_filterStyle] = this.fold.getStyle();
            } else {
                this.elemStyle[_transform3DStyle] = 'translate3d(' + (params.distance * 50) + '%, 0, 0)';
            }

            if(params.distance === 0) {
                this.resetShader();
                if(this.onUnPeekCallback) this.onUnPeekCallback();
            } else if(params.distance === 1) {
                var index = indexOf(needRenderItems, this);
                if(index > -1) needRenderItems.splice(index, 1);
            }
        }

/**
 * STATIC FUNCTIONS
 */

        function _onItemMove(e){
            if(!inputController.isScrollH) return;
            var i = _isDownItems.length;
            var params;
            var target;
            while(i--) {
                target = _isDownItems[i];
                if(!target.hasPeeked) {
                    if(target.onPeekCallback) target.onPeekCallback();
                    target.hasPeeked = true;
                }
                params = target.foldParams;
                params.distance += e.deltaX / params.width;
                if(params.distance > 0) params.distance = 0;
                target._setRender();
            }
        }

        function _onItemUp(e){
            if(sectionController.isAnimating()) return;
            var i = _isDownItems.length;
            if(e.distanceX < -150) {
                while(i--) if(_isDownItems[i].onOpenCallback) _isDownItems[i].onOpenCallback();
            } else {
                while(i--) _isDownItems[i].easeTo(0, .5, .3);
            }
            _isDownItems.length = 0;
        }

        function _renderAll(){
            var params, target;
            var i = needRenderItems.length;
            while(i--) needRenderItems[i].render();
        }

        _p._init = _init;
        _p.resetShader = resetShader;
        _p._setRender = _setRender;
        _p.updateSize = updateSize;
        _p.setTo = setTo;
        _p.easeTo = easeTo;
        _p.render = render;

        return FoldListItem;

    }
);
