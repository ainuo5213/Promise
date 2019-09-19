/**
 * Created by 16609 on 2019/9/19
 *
 */
var MyPromise = /** @class */ (function () {
    function MyPromise(fn) {
        var _this = this;
        // promise的三种状态，默认是pending
        this.status = 'pending';
        // promise的数据
        this.data = null;
        // 异步resolve队列
        this.resolvedArray = [];
        this.rejectedArray = [];
        this.resolved = function (data) {
            // pending => resolved
            // @ts-ignore
            // 利用setTimeout实现内部的异步晚于外部的同步
            // setTimeout(() => {
            if (_this.status === 'pending') {
                _this.data = data;
                _this.status = 'resolved';
                // resolved时，执行异步resolved队列的所有函数，使所有MyPromise决议
                _this.resolvedArray.forEach(function (fn) { return fn(); });
            }
            // }, 0)
        };
        this.rejected = function (data) {
            // pending => rejected
            // @ts-ignore
            // setTimeout(() => {
            if (_this.status === 'pending') {
                _this.data = data;
                _this.status = 'rejected';
                _this.rejectedArray.forEach(function (fn) { return fn(); });
            }
            // }, 0)
        };
        this.then = function (onResolved, onRejected) {
            // resolved的处理函数
            if (_this.status === "resolved") {
                return new MyPromise(function (resolved, rejected) {
                    // 这个值是有用的下保存下来
                    var res = onResolved(_this.data);
                    // 每一个then返回的data如果是常值的话那么其下一个then的状态默认是resolved
                    // 每一个then返回的promise，若promise是resolved，则下一个then的状态是resolved，否则是rejected
                    // 如果返回的res是MyPromise的实例的话，那么执行这个MyPromise进行决议看决议之后的状态，那么这个状态就是下一个then的状态
                    if (res instanceof MyPromise) {
                        res.then(resolved, rejected);
                    }
                    else {
                        // 如果返回的是普通值，则直接决议
                        resolved(res);
                    }
                });
                // rejected的处理函数
            }
            else if (_this.status === "rejected") {
                return new MyPromise(function (resolved, rejected) {
                    // 这个值是有用的下保存下来
                    var res = onRejected(_this.data);
                    if (res instanceof MyPromise) {
                        res.then(resolved, rejected);
                    }
                    else {
                        rejected(res);
                    }
                });
                // 处理异步，什么也没变化的处理函数
            }
            else if (_this.status === "pending") {
                // 现在我不知道这个的状态，所以要当异步完成之后，再决议这个MyPromise，所以要把这个MyPromise存起来
                return new MyPromise(function (resolved, rejected) {
                    // 这里通过立即执行函数，得到外部的决议函数，在内部返回这个决议（通过闭包）
                    _this.resolvedArray.push((function (onResolved) {
                        return function () {
                            var res = onResolved(_this.data);
                            if (res instanceof MyPromise) {
                                res.then(resolved, rejected);
                            }
                            else {
                                resolved(res);
                            }
                        };
                    })(onResolved));
                    _this.rejectedArray.push((function (onRejected) {
                        return function () {
                            var res = onRejected(_this.data);
                            if (res instanceof MyPromise) {
                                res.then(resolved, rejected);
                            }
                            else {
                                rejected(res);
                            }
                        };
                    })(onRejected));
                });
            }
        };
        this["catch"] = function (onRejected) {
            return _this.then(null, onRejected);
        };
        this["finally"] = function (fn) {
            return _this.then(function (value) { return _this.resolved(fn(value)); }, function (err) { return _this.rejected(fn(err)); });
        };
        if (typeof fn !== 'function') {
            throw Error("Promise resolver " + fn + " is not a function");
        }
        fn(this.resolved, this.rejected);
    }
    return MyPromise;
}());
