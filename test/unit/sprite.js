describe('Sprite', function() {
  var MARGIN_OF_ERROR = 0.0000001;
  var pInst;

  beforeEach(function() {
    pInst = new p5(function() {});
  });

  afterEach(function() {
    pInst.remove();
  });

  it('sets correct coordinate mode for rendering', function() {
    // Note: This test reaches into p5's internals somewhat more than usual.
    // It's designed to catch a particular rendering regression reported in
    // issue #48, where certain local constants are initialized incorrectly.
    // See https://github.com/molleindustria/p5.play/issues/48
    expect(p5.prototype.CENTER).to.not.be.undefined;
    var rectMode, ellipseMode, imageMode;

    // Monkeypatch sprite's draw method to inspect coordinate mode at draw-time.
    var sprite = pInst.createSprite();
    sprite.draw = function() {
      rectMode = pInst._renderer._rectMode;
      ellipseMode = pInst._renderer._ellipseMode;
      imageMode = pInst._renderer._imageMode;
    };
    pInst.drawSprites();

    // Check captured modes.
    expect(rectMode).to.equal(p5.prototype.CENTER);
    expect(ellipseMode).to.equal(p5.prototype.CENTER);
    expect(imageMode).to.equal(p5.prototype.CENTER);
  });

  describe('getDirection', function() {
    var sprite;

    beforeEach(function() {
      sprite = pInst.createSprite();
    });

    function checkDirectionForVelocity(v, d) {
      sprite.velocity.x = v[0];
      sprite.velocity.y = v[1];
      expect(sprite.getDirection()).to.equal(d);
    }

    it('returns zero when there is no velocity', function() {
      checkDirectionForVelocity([0, 0], 0);
    });

    it('positive or zero y velocity gives a positive direction', function() {
      checkDirectionForVelocity([-1, 0], 180);
      checkDirectionForVelocity([0, 0], 0);
      checkDirectionForVelocity([1, 0], 0);

      checkDirectionForVelocity([-1, 1], 135);
      checkDirectionForVelocity([0, 1], 90);
      checkDirectionForVelocity([1, 1], 45);
    });

    it('negative y velocity gives a negative direction', function() {
      checkDirectionForVelocity([-1, -1], -135);
      checkDirectionForVelocity([0, -1], -90);
      checkDirectionForVelocity([1, -1], -45);
    });

    it('returns degrees when p5 angleMode is RADIANS', function() {
      pInst.angleMode(p5.prototype.RADIANS);
      checkDirectionForVelocity([1, 1], 45);
      checkDirectionForVelocity([0, 1], 90);
    });

    it('returns degrees when p5 angleMode is DEGREES', function() {
      pInst.angleMode(p5.prototype.DEGREES);
      checkDirectionForVelocity([1, 1], 45);
      checkDirectionForVelocity([0, 1], 90);
    });

  });

  describe('dimension updating when animation changes', function() {
    it('animation width and height get inherited from frame', function() {
      var image = new p5.Image(100, 100, pInst);
      var frames = [
        {name: 0, frame: {x: 0, y: 0, width: 30, height: 30}}
      ];
      var sheet = new pInst.SpriteSheet(image, frames);
      var animation = new pInst.Animation(sheet);

      var sprite = pInst.createSprite(0, 0);
      sprite.addAnimation('label', animation);

      expect(sprite.width).to.equal(30);
      expect(sprite.height).to.equal(30);
    });

    it('updates the width and height property when frames are different sizes', function() {
      var image = new p5.Image(100, 100, pInst);
      var frames = [
        {name: 0, frame: {x: 0, y: 0, width: 50, height: 50}},
        {name: 1, frame: {x: 100, y: 0, width: 40, height: 60}},
        {name: 2, frame: {x: 0, y: 80, width: 70, height: 30}}
      ];
      var sheet = new pInst.SpriteSheet(image, frames);
      var animation = new pInst.Animation(sheet);

      var sprite = pInst.createSprite(0, 0);
      sprite.addAnimation('label', animation);

      expect(sprite.width).to.equal(50);
      expect(sprite.height).to.equal(50);

      // Frame changes after every 4th update because of frame delay.
      sprite.update();
      sprite.update();
      sprite.update();
      sprite.update();
      expect(sprite.width).to.equal(40);
      expect(sprite.height).to.equal(60);

      sprite.update();
      sprite.update();
      sprite.update();
      sprite.update();
      expect(sprite.width).to.equal(70);
      expect(sprite.height).to.equal(30);
    });
  });

  describe('mouse events', function() {
    var sprite;

    beforeEach(function() {
      // Create a sprite with centered at 50,50 with size 100,100.
      // Its default collider picks up anything from 1,1 to 99,99.
      sprite = pInst.createSprite(50, 50, 100, 100);
      sprite.onMouseOver = sinon.spy();
      sprite.onMouseOut = sinon.spy();
      sprite.onMousePressed = sinon.spy();
      sprite.onMouseReleased = sinon.spy();
    });

    function moveMouseTo(x, y) {
      pInst.mouseX = x;
      pInst.mouseY = y;
      sprite.update();
    }

    function moveMouseOver() {
      moveMouseTo(1, 1);
    }

    function moveMouseOut() {
      moveMouseTo(0, 0);
    }

    function pressMouse() {
      pInst.mouseIsPressed = true;
      sprite.update();
    }

    function releaseMouse() {
      pInst.mouseIsPressed = false;
      sprite.update();
    }

    it('mouseIsOver property represents whether mouse is over collider', function() {
      moveMouseTo(0, 0);
      expect(sprite.mouseIsOver).to.be.false;
      moveMouseTo(1, 1);
      expect(sprite.mouseIsOver).to.be.true;
      moveMouseTo(99, 99);
      expect(sprite.mouseIsOver).to.be.true;
      moveMouseTo(100, 100);
      expect(sprite.mouseIsOver).to.be.false;
    });

    describe('onMouseOver callback', function() {
      it('calls onMouseOver when the mouse enters the sprite collider', function() {
        moveMouseOut();
        expect(sprite.onMouseOver.called).to.be.false;
        moveMouseOver();
        expect(sprite.onMouseOver.called).to.be.true;
      });

      it('does not call onMouseOver when the mouse moves within the sprite collider', function() {
        moveMouseTo(0, 0);
        expect(sprite.onMouseOver.callCount).to.equal(0);
        moveMouseTo(1, 1);
        expect(sprite.onMouseOver.callCount).to.equal(1);
        moveMouseTo(2, 2);
        expect(sprite.onMouseOver.callCount).to.equal(1);
      });

      it('calls onMouseOver again when the mouse leaves and returns', function() {
        moveMouseOut();
        expect(sprite.onMouseOver.callCount).to.equal(0);
        moveMouseOver();
        expect(sprite.onMouseOver.callCount).to.equal(1);
        moveMouseOut();
        expect(sprite.onMouseOver.callCount).to.equal(1);
        moveMouseOver();
        expect(sprite.onMouseOver.callCount).to.equal(2);
      });
    });

    describe('onMouseOut callback', function() {
      it('calls onMouseOut when the mouse leaves the sprite collider', function() {
        moveMouseOver();
        expect(sprite.onMouseOut.called).to.be.false;
        moveMouseOut();
        expect(sprite.onMouseOut.called).to.be.true;
      });

      it('does not call onMouseOut when the mouse moves outside the sprite collider', function() {
        moveMouseTo(0, 0);
        expect(sprite.onMouseOut.called).to.be.false;
        moveMouseTo(0, 1);
        expect(sprite.onMouseOut.called).to.be.false;
      });

      it('calls onMouseOut again when the mouse returns and leaves', function() {
        moveMouseOver();
        expect(sprite.onMouseOut.callCount).to.equal(0);
        moveMouseOut();
        expect(sprite.onMouseOut.callCount).to.equal(1);
        moveMouseOver();
        expect(sprite.onMouseOut.callCount).to.equal(1);
        moveMouseOut();
        expect(sprite.onMouseOut.callCount).to.equal(2);
      });
    });

    describe('onMousePressed callback', function() {
      it('does not call onMousePressed if the mouse was not over the sprite', function() {
        expect(sprite.mouseIsOver).to.be.false;
        pressMouse();
        expect(sprite.onMousePressed.called).to.be.false;
      });

      it('calls onMousePressed if the mouse was pressed over the sprite', function() {
        moveMouseOver();
        pressMouse();
        expect(sprite.onMousePressed.called).to.be.true;
      });

      it('calls onMousePressed if the mouse was pressed outside the sprite then dragged over it', function() {
        pressMouse();
        moveMouseOver();
        expect(sprite.onMousePressed.called).to.be.true;
      });
    });

    describe('onMouseReleased callback', function() {
      it('does not call onMouseReleased if the mouse was never pressed over the sprite', function() {
        expect(sprite.mouseIsOver).to.be.false;
        pressMouse();
        releaseMouse();
        expect(sprite.onMouseReleased.called).to.be.false;
      });

      it('calls onMouseReleased if the mouse was pressed and released over the sprite', function() {
        moveMouseOver();
        pressMouse();
        releaseMouse();
        expect(sprite.onMouseReleased.called).to.be.true;
      });

      it('calls onMouseReleased if the mouse was pressed, moved over the sprite, and then released', function() {
        pressMouse();
        moveMouseOver();
        releaseMouse();
        expect(sprite.onMouseReleased.called).to.be.true;
      });

      it('does not call onMouseReleased on mouse-out if mouse is still down', function() {
        pressMouse();
        moveMouseOver();
        moveMouseOut();
        expect(sprite.onMouseReleased.called).to.be.false;
      });

      it('does not call onMouseReleased on release if mouse has left sprite', function() {
        moveMouseOver();
        pressMouse();
        moveMouseOut();
        releaseMouse();
        expect(sprite.onMouseReleased.called).to.be.false;
      });
    });
  });

  describe('setCollider()', function() {
    var sprite;

    beforeEach(function() {
      // Position: (10, 20), Size: (30, 40)
      sprite = pInst.createSprite(10, 20, 30, 40);
    });

    it('a newly-created sprite has no collider', function() {
      expect(sprite.collider).to.be.undefined;
    });

    it('throws if first argument is not a valid type', function() {
      // Also throws if undefined
      expect(function() {
        sprite.setCollider('notAType');
      }).to.throw(TypeError, 'setCollider expects the first argument to be one of "point", "circle", "rectangle", "aabb" or "obb"');

      // Also throws if undefined
      expect(function() {
        sprite.setCollider();
      }).to.throw(TypeError, 'setCollider expects the first argument to be one of "point", "circle", "rectangle", "aabb" or "obb"');

      // Note that it's not case-sensitive
      expect(function() {
        sprite.setCollider('CIRCLE');
      }).not.to.throw();
    });

    describe('"point"', function() {
      it('can construct a collider with default offset', function() {
        sprite.setCollider('point');
        expect(sprite.collider).to.be.an.instanceOf(p5.PointCollider);
        expect(sprite.collider.center.equals(sprite.position)).to.be.true;
      });

      it('can construct a collider with custom offset', function() {
        sprite.setCollider('point', 2, 3);
        expect(sprite.collider).to.be.an.instanceOf(p5.PointCollider);
        expect(sprite.collider.center.x).to.eq(sprite.position.x + 2);
        expect(sprite.collider.center.y).to.eq(sprite.position.y + 3);
        expect(sprite.collider.offset.x).to.eq(2);
        expect(sprite.collider.offset.y).to.eq(3);
      });

      it('stores unscaled custom offset', function() {
        sprite.scale = 2;
        sprite.setCollider('point', 4, 6);
        expect(sprite.collider).to.be.an.instanceOf(p5.PointCollider);
        expect(sprite.collider.center.x).to.eq(sprite.position.x + 8);
        expect(sprite.collider.center.y).to.eq(sprite.position.y + 12);
        expect(sprite.collider.offset.x).to.eq(4);
        expect(sprite.collider.offset.y).to.eq(6);
      });

      it('stores unrotated custom offset', function() {
        sprite.rotation = 90;
        sprite.setCollider('point', 2, 3);
        expect(sprite.collider).to.be.an.instanceOf(p5.PointCollider);
        expect(sprite.collider.center.x).to.eq(sprite.position.x - 3);
        expect(sprite.collider.center.y).to.eq(sprite.position.y + 2);
        expect(sprite.collider.offset.x).to.eq(2);
        expect(sprite.collider.offset.y).to.eq(3);
      });

      it('stores unrotated and unscaled custom offset if sprite was already rotated and scaled', function() {
        sprite.scale = 2;
        sprite.rotation = 90;
        sprite.setCollider('point', 2, 3);
        expect(sprite.collider).to.be.an.instanceOf(p5.PointCollider);
        expect(sprite.collider.center.x).to.eq(sprite.position.x - 6);
        expect(sprite.collider.center.y).to.eq(sprite.position.y + 4);
        expect(sprite.collider.offset.x).to.eq(2);
        expect(sprite.collider.offset.y).to.eq(3);
      });

      it('throws if creating a point collider with 2 or 4+ params', function() {
        // setCollider('point') is okay

        expect(function() {
          sprite.setCollider('point', 2);
        }).to.throw(TypeError);

        // setCollider('point', offsetX, offsetY) is okay

        expect(function() {
          sprite.setCollider('point', 1, 2, 3);
        }).to.throw(TypeError);

        expect(function() {
          sprite.setCollider('point', 1, 2, 3, 4);
        }).to.throw(TypeError);
      });
    });

    describe('"circle"', function() {
      it('can construct collider with default radius and offset', function() {
        sprite.setCollider('circle');
        expect(sprite.collider).to.be.an.instanceOf(p5.CircleCollider);

        // Center should match sprite position
        expect(sprite.collider.center.equals(sprite.position)).to.be.true;

        // Radius should be half of sprite's larger dimension.
        expect(sprite.height).to.be.greaterThan(sprite.width);
        expect(sprite.collider.radius).to.eq(sprite.height / 2);
      });

      it('can construct a collider with default radius and custom offset', function() {
        sprite.setCollider('circle', 2, 3);
        expect(sprite.collider).to.be.an.instanceOf(p5.CircleCollider);

        // Center should be sprite position + offset
        expect(sprite.collider.center.x).to.eq(sprite.position.x + 2);
        expect(sprite.collider.center.y).to.eq(sprite.position.y + 3);

        // Radius should be half of sprite's larger dimension.
        expect(sprite.height).to.be.greaterThan(sprite.width);
        expect(sprite.collider.radius).to.eq(sprite.height / 2);
      });

      it('can construct a collider with custom radius and offset', function() {
        sprite.setCollider('circle', 2, 3, 4);
        expect(sprite.collider).to.be.an.instanceOf(p5.CircleCollider);

        // Center should be sprite position + offset
        expect(sprite.collider.center.x).to.eq(sprite.position.x + 2);
        expect(sprite.collider.center.y).to.eq(sprite.position.y + 3);

        // Radius should be as given
        expect(sprite.collider.radius).to.be.closeTo(4, MARGIN_OF_ERROR);
      });

      it('when created from a scaled sprite, has correct scaled radius', function() {
        sprite.scale = 0.25;
        sprite.setCollider('circle');
        // collider.radius is unscaled
        expect(sprite.collider.radius).to.eq(sprite.height / 2);
        // collider radius on axis will be in world-space though, and scaled.
        expect(sprite.collider._getRadiusOnAxis()).to.eq(sprite.height / 8);

        // Just changing the sprite scale is not enough to update the collider...
        // though it'd be fine if this changed in the future.
        sprite.scale = 0.5;
        expect(sprite.collider._getRadiusOnAxis()).to.eq(sprite.height / 8);

        // Right now, an update() call is required for a new sprite scale to
        // get picked up.
        sprite.update();
        expect(sprite.collider._getRadiusOnAxis()).to.eq(sprite.height / 4);
      });

      it('throws if creating a circle collider with 2 or 5+ params', function() {
        // setCollider('circle') is fine

        expect(function() {
          sprite.setCollider('circle', 1);
        }).to.throw(TypeError);

        // setCollider('circle', offsetX, offsetY) is fine


        // setCollider('circle', offsetX, offsetY, radius) is fine

        expect(function() {
          sprite.setCollider('circle', 1, 2, 3, 4);
        }).to.throw(TypeError);
        expect(function() {
          sprite.setCollider('circle', 1, 2, 3, 4, 5);
        }).to.throw(TypeError);
      });
    });

    describe('"aabb"', function() {
      it('can construct a collider with default dimensions and offset', function() {
        sprite.setCollider('aabb');
        expect(sprite.collider).to.be.an.instanceOf(p5.AxisAlignedBoundingBoxCollider);

        // Center should match sprite position
        expect(sprite.collider.center.equals(sprite.position)).to.be.true;

        // Width and height should match sprite dimensions
        expect(sprite.collider.width).to.eq(sprite.width);
        expect(sprite.collider.height).to.eq(sprite.height);
      });

      it('scaling sprite without animation does not affect default collider size', function() {
        sprite.scale = 0.25;
        sprite.setCollider('aabb');
        expect(sprite.collider.width).to.eq(sprite.width);
        expect(sprite.collider.height).to.eq(sprite.height);
      });

      it('can construct a collider with explicit dimensions and offset', function() {
        sprite.setCollider('aabb', 1, 2, 3, 4);
        expect(sprite.collider).to.be.an.instanceOf(p5.AxisAlignedBoundingBoxCollider);
        expect(sprite.collider.center.x).to.equal(sprite.position.x + 1);
        expect(sprite.collider.center.y).to.equal(sprite.position.y + 2);
        expect(sprite.collider.width).to.eq(3);
        expect(sprite.collider.height).to.eq(4);
        expect(sprite.collider.offset).to.be.an.instanceOf(p5.Vector);
        expect(sprite.collider.offset.x).to.eq(1);
        expect(sprite.collider.offset.y).to.eq(2);
      });

      it('throws if creating a collider with 2, 4, or 6+ params', function() {
        // setCollider('rectangle') is fine

        expect(function() {
          sprite.setCollider('aabb', 1);
        }).to.throw(TypeError);

        // setCollider('aabb', offsetX, offsetY) is fine

        expect(function() {
          sprite.setCollider('aabb', 1, 2, 3);
        }).to.throw(TypeError);

        // setCollider('aabb', offsetX, offsetY, width, height) is fine.

        expect(function() {
          sprite.setCollider('aabb', 1, 2, 3, 4, 5);
        }).to.throw(TypeError);

        expect(function() {
          sprite.setCollider('aabb', 1, 2, 3, 4, 5, 6);
        }).to.throw(TypeError);
      });
    });

    describe('"obb"', function() {
      it('can construct a collider with default offset, dimensions, and rotation', function() {
        sprite.setCollider('obb');
        expect(sprite.collider).to.be.an.instanceOf(p5.OrientedBoundingBoxCollider);

        // Center should match sprite position
        expect(sprite.collider.center.equals(sprite.position)).to.be.true;

        // Width and height should match sprite dimensions
        expect(sprite.collider.width).to.eq(sprite.width);
        expect(sprite.collider.height).to.eq(sprite.height);

        // Rotation should match sprite rotation
        expect(sprite.collider.rotation).to.eq(p5.prototype.radians(sprite.rotation));
      });

      it('can construct a collider with custom offset, default dimensions and rotation', function() {
        sprite.setCollider('obb', 2, 3);
        expect(sprite.collider).to.be.an.instanceOf(p5.OrientedBoundingBoxCollider);

        // Center should be sprite position + offset
        expect(sprite.collider.center.x).to.eq(sprite.position.x + 2);
        expect(sprite.collider.center.y).to.eq(sprite.position.y + 3);

        // Width and height should match sprite dimensions
        expect(sprite.collider.width).to.eq(sprite.width);
        expect(sprite.collider.height).to.eq(sprite.height);

        // Rotation should match sprite rotation
        expect(sprite.collider.rotation).to.eq(p5.prototype.radians(sprite.rotation));
      });

      it('can construct a collider with custom offset and dimensions, default rotation', function() {
        sprite.setCollider('obb', 2, 3, 4, 5);
        expect(sprite.collider).to.be.an.instanceOf(p5.OrientedBoundingBoxCollider);

        // Center should be sprite position + offset
        expect(sprite.collider.center.x).to.eq(sprite.position.x + 2);
        expect(sprite.collider.center.y).to.eq(sprite.position.y + 3);

        // Width and height should match sprite dimensions
        expect(sprite.collider.width).to.eq(4);
        expect(sprite.collider.height).to.eq(5);

        // Rotation should match sprite rotation
        expect(sprite.collider.rotation).to.eq(p5.prototype.radians(sprite.rotation));
      });
    });

    describe('"rectangle"', function() {
      it('is an alias to OBB', function() {
        sprite.setCollider('rectangle');
        expect(sprite.collider).to.be.an.instanceOf(p5.OrientedBoundingBoxCollider);
      });
    });
  });


  describe('friction', function() {
    var sprite;

    beforeEach(function() {
      sprite = pInst.createSprite();
    });

    it('has no effect on update() when set to 0', function() {
      sprite.velocity.x = 1;
      sprite.velocity.y = 1;
      sprite.friction = 0;
      sprite.update();
      expect(sprite.velocity.x).to.equal(1);
      expect(sprite.velocity.y).to.equal(1);
    });

    it('reduces velocity to zero on update() when set to 1', function() {
      sprite.velocity.x = 1;
      sprite.velocity.y = 1;
      sprite.friction = 1;
      sprite.update();
      expect(sprite.velocity.x).to.equal(0);
      expect(sprite.velocity.y).to.equal(0);
    });

    describe('axis-aligned', function() {
      beforeEach(function() {
        sprite.velocity.x = 16;
      });

      it('cuts velocity in half each update when set to 0.5', function() {
        sprite.friction = 0.5;
        expect(sprite.velocity.x).to.equal(16);
        sprite.update();
        expect(sprite.velocity.x).to.equal(8);
        sprite.update();
        expect(sprite.velocity.x).to.equal(4);
        sprite.update();
        expect(sprite.velocity.x).to.equal(2);
      });

      it('cuts velocity to one-quarter each update when set to 0.75', function() {
        sprite.friction = 0.75;
        expect(sprite.velocity.x).to.equal(16);
        sprite.update();
        expect(sprite.velocity.x).to.equal(4);
        sprite.update();
        expect(sprite.velocity.x).to.equal(1);
        sprite.update();
        expect(sprite.velocity.x).to.equal(0.25);
      });
    });

    describe('not axis-aligned', function() {
      beforeEach(function() {
        sprite.velocity.x = 3 * 16;
        sprite.velocity.y = 4 * 16;
      });

      it('cuts velocity in half each update when set to 0.5', function() {
        sprite.friction = 0.5;
        expect(sprite.velocity.x).to.equal(3 * 16);
        expect(sprite.velocity.y).to.equal(4 * 16);
        expect(sprite.velocity.mag()).to.equal(5 * 16);
        sprite.update();
        expect(sprite.velocity.x).to.equal(3 * 8);
        expect(sprite.velocity.y).to.equal(4 * 8);
        expect(sprite.velocity.mag()).to.equal(5 * 8);
        sprite.update();
        expect(sprite.velocity.x).to.equal(3 * 4);
        expect(sprite.velocity.y).to.equal(4 * 4);
        expect(sprite.velocity.mag()).to.equal(5 * 4);
        sprite.update();
        expect(sprite.velocity.x).to.equal(3 * 2);
        expect(sprite.velocity.y).to.equal(4 * 2);
        expect(sprite.velocity.mag()).to.equal(5 * 2);
      });

      it('cuts velocity to one-quarter each update when set to 0.75', function() {
        sprite.friction = 0.75;
        expect(sprite.velocity.x).to.equal(3 * 16);
        expect(sprite.velocity.y).to.equal(4 * 16);
        expect(sprite.velocity.mag()).to.equal(5 * 16);
        sprite.update();
        expect(sprite.velocity.x).to.equal(3 * 4);
        expect(sprite.velocity.y).to.equal(4 * 4);
        expect(sprite.velocity.mag()).to.equal(5 * 4);
        sprite.update();
        expect(sprite.velocity.x).to.equal(3 * 1);
        expect(sprite.velocity.y).to.equal(4 * 1);
        expect(sprite.velocity.mag()).to.equal(5 * 1);
        sprite.update();
        expect(sprite.velocity.x).to.equal(3 * 0.25);
        expect(sprite.velocity.y).to.equal(4 * 0.25);
        expect(sprite.velocity.mag()).to.equal(5 * 0.25);
      });
    });
  });

  describe('method aliases', function() {
    var testSprite;

    beforeEach(function() {
      testSprite = pInst.createSprite();
    });

    it('aliases setSpeed to setSpeedAndDirection', function() {
      testSprite.setSpeedAndDirection(5, 100);
      expect(testSprite.getSpeed()).to.be.closeTo(5, 0.01);
      expect(testSprite.getDirection()).to.be.closeTo(100, 0.01);
    });

    it('aliases remove to destroy', function() {
      testSprite.destroy();
      expect(testSprite.removed).to.be.true;
    });

    it('aliases animation.changeFrame to setFrame', function() {
      testSprite.addAnimation('label', createTestAnimation());
      sinon.stub(testSprite.animation, 'changeFrame');
      testSprite.setFrame();
      expect(testSprite.animation.changeFrame.calledOnce).to.be.true;
    });

    it('aliases animation.nextFrame to nextFrame', function() {
      testSprite.addAnimation('label', createTestAnimation());
      sinon.stub(testSprite.animation, 'nextFrame');
      testSprite.nextFrame();
      expect(testSprite.animation.nextFrame.calledOnce).to.be.true;
    });

    it('aliases animation.previousFrame to previousFrame', function() {
      testSprite.addAnimation('label', createTestAnimation());
      sinon.stub(testSprite.animation, 'previousFrame');
      testSprite.previousFrame();
      expect(testSprite.animation.previousFrame.calledOnce).to.be.true;
    });

    it('aliases animation.stop to pause', function() {
      testSprite.addAnimation('label', createTestAnimation());
      sinon.stub(testSprite.animation, 'stop');
      testSprite.pause();
      expect(testSprite.animation.stop.calledOnce).to.be.true;
    });
  });

  describe('property aliases', function() {
    var testSprite;

    beforeEach(function() {
      testSprite = pInst.createSprite();
    });

    it('aliases position.x to positionX', function() {
      testSprite.position.x = 1;
      expect(testSprite.position.x).to.equal(testSprite.x);
      var newValue = 2;
      testSprite.x = newValue;
      expect(testSprite.position.x).to.equal(testSprite.x).to.equal(newValue);
    });

    it('aliases position.y to positionY', function() {
      testSprite.position.y = 1;
      expect(testSprite.position.y).to.equal(testSprite.y);
      var newValue = 2;
      testSprite.y = newValue;
      expect(testSprite.position.y).to.equal(testSprite.y).to.equal(newValue);
    });

    it('aliases velocity.x to velocityX', function() {
      testSprite.velocity.x = 1;
      expect(testSprite.velocity.x).to.equal(testSprite.velocityX);
      var newValue = 2;
      testSprite.velocityX = newValue;
      expect(testSprite.velocity.x).to.equal(testSprite.velocityX).to.equal(newValue);
    });

    it('aliases velocity.y to velocityY', function() {
      testSprite.velocity.y = 1;
      expect(testSprite.velocity.y).to.equal(testSprite.velocityY);
      var newValue = 2;
      testSprite.velocityY = newValue;
      expect(testSprite.velocity.y).to.equal(testSprite.velocityY).to.equal(newValue);
    });

    it('aliases life to lifetime', function() {
      testSprite.life = 1;
      expect(testSprite.life).to.equal(testSprite.lifetime);
      var newValue = 2;
      testSprite.lifetime = newValue;
      expect(testSprite.life).to.equal(testSprite.lifetime).to.equal(newValue);
    });

    it('aliases restitution to bounciness', function() {
      testSprite.restitution = 1;
      expect(testSprite.restitution).to.equal(testSprite.bounciness);
      var newValue = 2;
      testSprite.bounciness = newValue;
      expect(testSprite.restitution).to.equal(testSprite.bounciness).to.equal(newValue);
    });
  });

  describe('isTouching', function() {
    it('returns false if the collider and colliding sprite dont overlap', function() {
      var sprite1 = pInst.createSprite(0, 0, 100, 100);
      var sprite2 = pInst.createSprite(200, 200, 100, 100);
      var isTouching1to2 = sprite1.isTouching(sprite2);
      var isTouching2to1 = sprite2.isTouching(sprite1);
      expect(isTouching1to2).to.equal(false).and.to.equal(isTouching2to1);
    });

    it('returns true if the collider and colliding sprite overlap', function() {
      var sprite3 = pInst.createSprite(150, 150, 100, 100);
      var sprite4 = pInst.createSprite(200, 200, 100, 100);
      var isTouching3to4 = sprite3.isTouching(sprite4);
      sprite4.isTouching(sprite3);
      expect(isTouching3to4).to.equal(true).and.to.equal(isTouching3to4);

      var sprite5 = pInst.createSprite(101, 101, 100, 100);
      var sprite6 = pInst.createSprite(200, 200, 100, 100);
      var isTouching5to6 = sprite5.isTouching(sprite6);
      sprite6.isTouching(sprite5);
      expect(isTouching5to6).to.equal(true).and.to.equal(isTouching5to6);
    });

    it('does not affect the location of the sprite', function() {
      var sprite1 = pInst.createSprite(170, 170, 100, 100);
      var sprite2 = pInst.createSprite(200, 200, 100, 100);
      var isTouching1to2 = sprite1.isTouching(sprite2);
      expect(isTouching1to2).to.equal(true);
      expect(sprite1.x).to.equal(170);
      expect(sprite1.y).to.equal(170);
      expect(sprite2.x).to.equal(200);
      expect(sprite2.y).to.equal(200);
    });

    it('does not affect the velocity of the sprites', function() {
      var sprite1 = pInst.createSprite(170, 170, 100, 100);
      var sprite2 = pInst.createSprite(200, 200, 100, 100);
      sprite1.velocityX = 1;
      sprite1.velocityY = 1;
      sprite2.velocityX = 0;
      sprite2.velocityY = 0;
      var isTouching1to2 = sprite1.isTouching(sprite2);
      expect(isTouching1to2).to.equal(true);
      expect(sprite1.velocityX).to.equal(1);
      expect(sprite1.velocityY).to.equal(1);
      expect(sprite2.velocityX).to.equal(0);
      expect(sprite2.velocityY).to.equal(0);
    });
  });

  describe('width, height', function() {
    describe('sprites without animations', function() {
      var sprite1;

      beforeEach(function() {
        sprite1 = pInst.createSprite(200, 200);
      });

      it('defaults to 100 by 100 when no width or height are set', function() {
        expect(sprite1.width).to.equal(100);
        expect(sprite1.height).to.equal(100);
      });

      it('gets and sets the same value', function() {
        sprite1.width = 200;
        sprite1.height = 450;
        expect(sprite1.width).to.equal(200);
        expect(sprite1.height).to.equal(450);
      });

      it('gets unscaled width and height', function() {
        sprite1.width = 200;
        sprite1.height = 450;
        sprite1.scale = 2;
        expect(sprite1.width).to.equal(200);
        expect(sprite1.height).to.equal(450);
        expect(sprite1.scale).to.equal(2);
        sprite1.scale = 0.5;
        expect(sprite1.width).to.equal(200);
        expect(sprite1.height).to.equal(450);
        expect(sprite1.scale).to.equal(0.5);
        sprite1.width = 100;
        expect(sprite1.width).to.equal(100);
      });
    });

    describe('sprites with animations', function() {
      var sprite;
      beforeEach(function() {
        var image = new p5.Image(100, 100, pInst);
        var frames = [{name: 0, frame: {x: 0, y: 0, width: 50, height: 50}}];
        var sheet = new pInst.SpriteSheet(image, frames);
        var animation = new pInst.Animation(sheet);
        sprite = pInst.createSprite(0, 0);
        sprite.addAnimation('label', animation);
      });

      it('defaults to image height and width when no width or height are set', function() {
        expect(sprite.width).to.equal(50);
        expect(sprite.height).to.equal(50);
      });

      it('gets and sets the same value', function() {
        sprite.width = 150;
        sprite.height = 200;
        expect(sprite.width).to.equal(150);
        expect(sprite.height).to.equal(200);
      });

      it('gets unscaled width and height', function() {
        sprite.width = 200;
        sprite.height = 450;
        sprite.scale = 2;
        expect(sprite.width).to.equal(200);
        expect(sprite.height).to.equal(450);
        expect(sprite.scale).to.equal(2);
        sprite.scale = 0.5;
        expect(sprite.width).to.equal(200);
        expect(sprite.height).to.equal(450);
        expect(sprite.scale).to.equal(0.5);
        sprite.width = 100;
        expect(sprite.width).to.equal(100);
      });
    });
  });

  describe('getScaledWidth, getScaledHeight', function() {
    describe('sprites without animations', function() {
      it('returns width and height when no scale is set', function() {
        var sprite1 = pInst.createSprite(200, 200);
        expect(sprite1.getScaledWidth()).to.equal(100);
        expect(sprite1.getScaledHeight()).to.equal(100);
        sprite1.width = 200;
        sprite1.height = 400;
        expect(sprite1.getScaledWidth()).to.equal(200);
        expect(sprite1.getScaledHeight()).to.equal(400);
      });

      it('gets scaled values', function() {
        var sprite1 = pInst.createSprite(200, 200);
        sprite1.width = 200;
        sprite1.height = 450;
        sprite1.scale = 2;
        expect(sprite1.getScaledWidth()).to.equal(400);
        expect(sprite1.getScaledHeight()).to.equal(900);
        expect(sprite1.scale).to.equal(2);
        sprite1.scale = 0.5;
        expect(sprite1.getScaledWidth()).to.equal(100);
        expect(sprite1.getScaledHeight()).to.equal(225);
        expect(sprite1.width).to.equal(200);
        expect(sprite1.height).to.equal(450);
        expect(sprite1.scale).to.equal(0.5);
        sprite1.width = 100;
        expect(sprite1.getScaledWidth()).to.equal(50);
      });
    });

    describe('sprites with animations', function() {
      var sprite1;
      beforeEach(function() {
        sprite1 = pInst.createSprite(0, 0);
        sprite1.addAnimation('label', createTestAnimation());
      });

      it('returns width and height when no scale is set', function() {
        expect(sprite1.getScaledWidth()).to.equal(50);
        expect(sprite1.getScaledHeight()).to.equal(50);
        sprite1.width = 200;
        sprite1.height = 400;
        expect(sprite1.getScaledWidth()).to.equal(200);
        expect(sprite1.getScaledHeight()).to.equal(400);
      });

      it('gets scaled values', function() {
        sprite1.width = 200;
        sprite1.height = 450;
        sprite1.scale = 2;
        expect(sprite1.getScaledWidth()).to.equal(400);
        expect(sprite1.getScaledHeight()).to.equal(900);
        expect(sprite1.scale).to.equal(2);
        sprite1.scale = 0.5;
        expect(sprite1.getScaledWidth()).to.equal(100);
        expect(sprite1.getScaledHeight()).to.equal(225);
        expect(sprite1.width).to.equal(200);
        expect(sprite1.height).to.equal(450);
        expect(sprite1.scale).to.equal(0.5);
        sprite1.width = 100;
        expect(sprite1.getScaledWidth()).to.equal(50);
      });

      it('gets scaled values regardless of colliders', function() {
        var sprite2 = pInst.createSprite(0, 0);
        sprite2.addAnimation('label', createTestAnimation());

        sprite1.width = 200;
        sprite1.height = 400;
        sprite1.scale = 2;

        expect(sprite1.getScaledWidth()).to.equal(400);
        expect(sprite1.getScaledHeight()).to.equal(800);
        sprite1.collide(sprite2);
        expect(sprite1.getScaledWidth()).to.equal(400);
        expect(sprite1.getScaledHeight()).to.equal(800);
      });
    });
  });

  describe('collision types using AABBOps', function() {
    var sprite, spriteTarget;

    beforeEach(function() {
      // sprite in to the left, moving right
      // spriteTarget in to the right, stationary
      sprite = pInst.createSprite(281, 100, 20, 20);
      spriteTarget = pInst.createSprite(300, 100, 20, 20);
      sprite.velocity.x = 3;
      spriteTarget.velocity.x = 0;

      expect(sprite.velocity.x).to.equal(3);
      expect(spriteTarget.velocity.x).to.equal(0);
    });

    it('stops movement of colliding sprite when sprites bounce', function() {
      // sprite stops moving, spriteTarget moves right
      var bounce = sprite.bounce(spriteTarget);

      expect(bounce).to.equal(true);

      expect(sprite.position.x).to.equal(280); // move back to not overlap with spriteTarget
      expect(spriteTarget.position.x).to.equal(300);
      expect(sprite.velocity.x).to.equal(0);
      expect(spriteTarget.velocity.x).to.equal(3);

      sprite.update();
      spriteTarget.update();

      expect(sprite.position.x).to.equal(280);
      expect(spriteTarget.position.x).to.equal(303);
      expect(sprite.velocity.x).to.equal(0);
      expect(spriteTarget.velocity.x).to.equal(3);

      sprite.bounce(spriteTarget);

      expect(sprite.position.x).to.equal(280);
      expect(spriteTarget.position.x).to.equal(303);
      expect(sprite.velocity.x).to.equal(0);
      expect(spriteTarget.velocity.x).to.equal(3);
    });

    it('stops movement of colliding sprite when sprites collide', function() {
      // sprite stops moving, spriteTarget stops moving
      var collide = sprite.collide(spriteTarget);

      expect(collide).to.equal(true);

      expect(sprite.position.x).to.equal(280);
      expect(spriteTarget.position.x).to.equal(300);
      expect(sprite.velocity.x).to.equal(0);
      expect(spriteTarget.velocity.x).to.equal(0);
    });

    it('continues movement of colliding sprite when sprites displace', function() {
      // sprite continues moving, spriteTarget gets pushed by sprite
      var displace = sprite.displace(spriteTarget);

      expect(displace).to.equal(true);
      expect(sprite.position.x).to.equal(281);
      expect(spriteTarget.position.x).to.equal(301);
      expect(sprite.velocity.x).to.equal(3);
      expect(spriteTarget.velocity.x).to.equal(0);

      sprite.update();
      spriteTarget.update();

      expect(sprite.position.x).to.equal(284);
      expect(spriteTarget.position.x).to.equal(301);
      expect(sprite.velocity.x).to.equal(3);
      expect(spriteTarget.velocity.x).to.equal(0);

      // Displace is true again, since sprite keeps moving into spriteTarget
      var displace2 = sprite.displace(spriteTarget);
      expect(displace2).to.be.true;
    });

    it('reverses direction of colliding sprite when sprites bounceOff', function() {
      // sprite reverses direction of movement, spriteTarget remains in its location
      var bounceOff = sprite.bounceOff(spriteTarget);

      expect(bounceOff).to.equal(true);
      expect(sprite.position.x).to.equal(280);
      expect(spriteTarget.position.x).to.equal(300);
      expect(sprite.velocity.x).to.equal(-3);
      expect(spriteTarget.velocity.x).to.equal(0);

      sprite.update();
      spriteTarget.update();

      expect(bounceOff).to.equal(true);
      expect(sprite.position.x).to.equal(277);
      expect(spriteTarget.position.x).to.equal(300);
      expect(sprite.velocity.x).to.equal(-3);
      expect(spriteTarget.velocity.x).to.equal(0);

      sprite.bounceOff(spriteTarget);

      expect(bounceOff).to.equal(true);
      expect(sprite.position.x).to.equal(277);
      expect(spriteTarget.position.x).to.equal(300);
      expect(sprite.velocity.x).to.equal(-3);
      expect(spriteTarget.velocity.x).to.equal(0);
    });

    it('continues movement of colliding sprite when sprites overlap', function() {
      // sprite continues moving, spriteTarget remains in it's location
      var overlap = sprite.overlap(spriteTarget);

      expect(overlap).to.equal(true);
      expect(sprite.position.x).to.equal(281);
      expect(spriteTarget.position.x).to.equal(300);
      expect(sprite.velocity.x).to.equal(3);
      expect(spriteTarget.velocity.x).to.equal(0);

      sprite.update();
      spriteTarget.update();

      expect(overlap).to.equal(true);
      expect(sprite.position.x).to.equal(284);
      expect(spriteTarget.position.x).to.equal(300);
      expect(sprite.velocity.x).to.equal(3);
      expect(spriteTarget.velocity.x).to.equal(0);

      sprite.overlap(spriteTarget);

      expect(overlap).to.equal(true);
      expect(sprite.position.x).to.equal(284);
      expect(spriteTarget.position.x).to.equal(300);
      expect(sprite.velocity.x).to.equal(3);
      expect(spriteTarget.velocity.x).to.equal(0);
    });

    it('destroyed sprites do not collide', function() {
      expect(sprite.overlap(spriteTarget)).to.equal(true);
      spriteTarget.remove();
      expect(sprite.overlap(spriteTarget)).to.equal(false);
      expect(spriteTarget.overlap(sprite)).to.equal(false);
    });
  });

  function createTestAnimation(frameCount, looping) {
    if (frameCount === undefined) {
      frameCount = 1;
    }
    if (looping === undefined) {
      looping = true;
    }
    var image = new p5.Image(100, 100, pInst);
    var frames = [];
    for (var i = 0; i < frameCount; i++) {
      frames.push({name: i, frame: {x: 0, y: 0, width: 50, height: 50}});
    }
    var sheet = new pInst.SpriteSheet(image, frames);
    var animation = new pInst.Animation(sheet);
    animation.looping = looping;
    animation.frameDelay = 1;
    return animation;
  }
});
