/**
 * Created by 16609 on 2019/9/19
 *
 */
class MyPromise {
    // promise的三种状态，默认是pending
    private status: 'pending' | 'resolved' | 'rejected' = 'pending';
    // promise的数据
    private data: any = null;
    // 异步resolve队列
    private resolvedArray: Function[] = [];
    private rejectedArray: Function[] = [];
    private resolved = (data: any): any => {
        // pending => resolved
        // @ts-ignore
        // 利用setTimeout实现内部的异步晚于外部的同步
        setTimeout(() => {
            if (this.status === 'pending') {
                this.data = data;
                this.status = 'resolved';
                // resolved时，执行异步resolved队列的所有函数，使所有MyPromise决议
                this.resolvedArray.forEach((fn: Function) => fn())
            }
        }, 0)
    };

    protected rejected = (data: any): any => {
        // pending => rejected
        // @ts-ignore
        setTimeout(() => {
            if (this.status === 'pending') {
                this.data = data;
                this.status = 'rejected';
                this.rejectedArray.forEach((fn: Function) => fn())
            }
        }, 0)
    };

    public then = (onResolved: Function, onRejected?: Function): MyPromise => {
        // resolved的处理函数
        if (this.status === "resolved") {
            return new MyPromise((resolved: Function, rejected?: Function) => {
                // 这个值是有用的下保存下来
                let res: any = onResolved(this.data);
                // 每一个then返回的data如果是常值的话那么其下一个then的状态默认是resolved
                // 每一个then返回的promise，若promise是resolved，则下一个then的状态是resolved，否则是rejected
                // 如果返回的res是MyPromise的实例的话，那么执行这个MyPromise进行决议看决议之后的状态，那么这个状态就是下一个then的状态
                if (res instanceof MyPromise) {
                    res.then(resolved, rejected)
                } else {
                    // 如果返回的是普通值，则直接决议
                    resolved(res)
                }
            })
            // rejected的处理函数
        } else if (this.status === "rejected") {
            return new MyPromise((resolved: Function, rejected?: Function) => {
                // 这个值是有用的下保存下来
                let res: any = onRejected(this.data);
                if (res instanceof MyPromise) {
                    res.then(resolved, rejected)
                } else {
                    rejected(res)
                }
            })
            // 处理异步，什么也没变化的处理函数
        } else if (this.status === "pending") {
            // 现在我不知道这个的状态，所以要当异步完成之后，再决议这个MyPromise，所以要把这个MyPromise存起来
            return new MyPromise((resolved: Function, rejected: Function) => {
                // 这里通过立即执行函数，得到外部的决议函数，在内部返回这个决议（通过闭包）
                this.resolvedArray.push(((onResolved: Function) => {
                    return () => {
                        let res: any = onResolved(this.data);
                        if (res instanceof MyPromise) {
                            res.then(resolved, rejected)
                        } else {
                            resolved(res)
                        }
                    }
                })(onResolved));
                this.rejectedArray.push(((onRejected: Function) => {
                    return () => {
                        let res: any = onRejected(this.data);
                        if (res instanceof MyPromise) {
                            res.then(resolved, rejected)
                        } else {
                            rejected(res)
                        }
                    }
                })(onRejected));
            })
        }
    };

    public catch = (onRejected: Function): MyPromise => {
        return this.then(null, onRejected)
    };

    public finally = (fn: Function): MyPromise => {
        return this.then(
            (value: any) => this.resolved(fn(value)),
            (err: any) => this.rejected(fn(err))
        );
    };

    constructor(fn: Function) {
        if (typeof fn !== 'function') {
            throw Error(`Promise resolver ${fn} is not a function`)
        }
        fn(this.resolved, this.rejected)
    }
}
