/*
    CardLayout is an object that represents a player's hand (or a discard pile)
    It is composed of LayoutChild objects
*/

// Imports
const globals = require('./globals');
const graphics = require('./graphics');

class CardLayout extends graphics.Group {
    constructor(config) {
        config.listening = config.player !== -1; // Discard piles do not need to be listening
        super(config);

        // Class variables
        this.align = config.align || 'left';
        this.reverse = config.reverse || false;
        this.invertCards = config.invertCards || false;
        this.rotation = config.rotation;

        // Debug rectangle (uncomment to show the size of the hand)
        /*
        const debugRect = new graphics.Rect({
            x: config.x,
            y: config.y,
            width: config.width,
            height: config.height,
            fill: 'black',
            rotation: config.rotation,
        });
        globals.layers.UI.add(debugRect);
        */
    }

    add(child) {
        child.children.forEach((card) => {
            if (card.doRotations) {
                card.doRotations(this.invertCards);
            }
        });
        const pos = child.getAbsolutePosition();
        graphics.Group.prototype.add.call(this, child);
        child.setAbsolutePosition(pos);
        this.doLayout();
    }

    _setChildrenIndices() {
        graphics.Group.prototype._setChildrenIndices.call(this);
        this.doLayout();
    }

    doLayout() {
        let uw = 0;
        let dist = 0;
        let x = 0;

        const lw = this.getWidth();
        const lh = this.getHeight();

        const n = this.children.length;

        for (let i = 0; i < n; i++) {
            const node = this.children[i]; // This is a LayoutChild

            if (!node.getHeight()) {
                continue;
            }

            const scale = lh / node.getHeight();
            uw += scale * node.getWidth();
        }

        if (n > 1) {
            dist = (lw - uw) / (n - 1);
        }

        if (dist > 10) {
            dist = 10;
        }

        uw += dist * (n - 1);

        if (this.align === 'center' && uw < lw) {
            x = (lw - uw) / 2;
        }

        if (this.reverse) {
            x = lw - x;
        }

        const storedPostAnimationLayout = globals.postAnimationLayout;

        for (let i = 0; i < n; i++) {
            const node = this.children[i]; // This is a LayoutChild

            if (!node.getHeight()) {
                continue;
            }

            const scale = lh / node.getHeight();

            if (node.tween) {
                node.tween.destroy();
            }

            if (globals.animateFast) {
                node.setX(x - (this.reverse ? scale * node.getWidth() : 0));
                node.setY(0);
                node.setScaleX(scale);
                node.setScaleY(scale);
                node.setRotation(0);
                node.checkSetDraggable();
            } else {
                // Animate the card going from the deck to the hand
                // (or from the hand to the discard pile)
                const card = node.children[0];
                card.tweening = true;
                let justDiscarded = card.turnDiscarded === globals.turn - 1;
                if (globals.speedrun) {
                    // For speedruns, we get here a turn earlier,
                    // since it doesn't tween to the play stacks
                    justDiscarded = card.turnDiscarded === globals.turn;
                }
                if (card.isMisplayed && justDiscarded) {
                    // If this card just misplayed, do a special animation
                    node.setRotation(360);
                }
                node.tween = new graphics.Tween({
                    node,
                    duration: 0.5,
                    x: x - (this.reverse ? scale * node.getWidth() : 0),
                    y: 0,
                    scaleX: scale,
                    scaleY: scale,
                    rotation: 0,
                    runonce: true,
                    onFinish: () => {
                        card.tweening = false;
                        node.checkSetDraggable();
                        if (storedPostAnimationLayout !== null) {
                            storedPostAnimationLayout();
                        }
                    },
                }).play();
            }

            x += (scale * node.getWidth() + dist) * (this.reverse ? -1 : 1);
        }
    }

    getAbsoluteCenterPos() {
        const pos = this.getAbsolutePosition();

        const w = this.getWidth();
        const h = this.getHeight();

        // The rotation comes from Konva in radians but we need to convert it to degrees
        const rot = this.rotation / 180 * Math.PI;

        pos.x += w / 2 * Math.cos(rot) - h / 2 * Math.sin(rot);
        pos.y += w / 2 * Math.sin(rot) + h / 2 * Math.cos(rot);

        return pos;
    }

    isLocked() {
        for (const layoutChild of this.children) {
            const card = layoutChild.children[0];
            if (!card.isClued()) {
                return false;
            }
        }
        return true;
    }
}

module.exports = CardLayout;
