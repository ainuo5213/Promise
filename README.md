# Promise
Promise的原理和基本实现（Typescript）
### Promise的三种状态
#### constructor
我们知道Promise有三种状态：
1. pending
2. resolved(fulfilled)
3. rejected

&#8195;&#8195;这三种``状态唯一``，要么是pending、要么是resolved(fullfiled)、要么是rejected，所以我们在实现的时候需要定义类的三种状态。
&#8195;&#8195;除此之外，``Promise的构造函数需要我们传入一个函数作为参数，而且这个函数被分为resolve和reject来进行决议``
```javascript
class MyPromise {
 	private status: 'pending' | 'resolved' | 'rejected' = 'pending';
	constructor(fn: Function) {
	     if (typeof fn !== 'function') {
	         throw Error(`Promise resolver ${fn} is not a function`)
	     }
	     fn(this.resolved, this.rejected)
	}
}
```
&#8195;&#8195;为什么我要让fn立即执行并传入两个参数呢？这里我们可以试试原生Promise。
```javascript
let promise = new Promise((resolve, reject) => resolve(123));
console.log(promise )
```
![在这里插入图片描述](https://img-blog.csdnimg.cn/20190919193421298.png)
&#8195;&#8195;可以看到Promise被new出来就被``决议``了，所以这里必然会传入两个参数。一个是决议成功的处理函数，一个是决议失败的处理函数。
#### 同步的resolved处理函数
&#8195;&#8195;决议成功函数主要用于改变``MyPormise``的状态为``resolved``，以及保存决议的结果。因为这个决议结果我们会在``then``中使用，所以使用``this``进行保存。
```javascript
private resolved = (data: any): any => {
       // pending => resolved
     if (this.status === 'pending') {
           this.data = data;
           this.status = 'resolved';
      }
 };
```
#### 同步的rejected处理函数
与上面同步的resolved处理函数类似，只不过这个处理函数是将状态改为``rejected``；
```javascript
private resolved = (data: any): any => {
       // pending => resolved
     if (this.status === 'pending') {
           this.data = data;
           this.status = 'rejected';
      }
 };
```
#### then函数
在书写then函数之前，我们需要知道then函数的功能。
1. then函数接收两个参数，并且这两个参数都是带有一个参数的函数，前者为决议成功时的函数，后者为决议失败时的函数，而且第二个参数是可选参数。
2. then函数返回一个Promise，若传入的函数并没有返回值则将undefined作为下一个Promise的data；若传入的函数返回值是一个普通值（非Promise），则将这个值作为下一个Promise的data；若传入的函数返回值是一个Promise，则等待这个Promise的决议完成，再将这个决议结果作为下一个Promise的返回值。

知道了这些功能，我们就可以来书写代码了。
```javascript
public then = (onResolved: Function, onRejected?: Function): MyPromise => {
        // resolved的处理函数
        if (this.status === "resolved") {
            return new MyPromise((resolved: Function, rejected?: Function) => {
                // 这个值返回值是有用的，保存下来
                let res: any = onResolved(this.data);
                // 如果返回值是MyPromise的实例，则等待这个MyPromise决议
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
                let res: any = onRejected(this.data);
                if (res instanceof MyPromise) {
                    res.then(resolved, rejected)
                } else {
                    rejected(res)
                }
            })
            // 处理异步，什么也没变化的处理函数。后面再处理
        } else if (this.status === "pending") {
           
        }
    };
```
&#8195;&#8195;如果各位写的代码没错的话，处理同步决议问题，是没错的。但是处理异步决议问题，则会一直处于``rejected或resolved``状态，因为``MyPromise``的函数执行时要等待决议的完成，但是因为这个是异步决议，这个决议会在调用栈尾部进行决议，所以他们双方互相等待。
#### 处理异步决议问题
要想处理异步决议，我们就必须获得异步调用栈的所有函数，然后在异步执行完成之后进行决议。
```javascript
// 异步调用栈的临时储存数组
private resolvedArray: Function[] = [];
private rejectedArray: Function[] = [];

protected resolved = (data: any): any => {
    // pending => rejected
    if (this.status === 'pending') {
        this.data = data;
        this.status = 'resolved';
        // 同步决议完成之后，执行异步队列的决议函数
        this.resolvedArray.forEach((fn: Function) => fn())
    }
};

protected rejected = (data: any): any => {
    // pending => rejected
    if (this.status === 'pending') {
        this.data = data;
        this.status = 'rejected';
        this.rejectedArray.forEach((fn: Function) => fn())
    }
};

public then = (onResolved: Function, onRejected?: Function): MyPromise => {
	.....
	else if (this.status === "pending") {
		// 现在我不知道这个的状态，所以要当异步完成之后，再决议这个MyPromise，所以要把这个MyPromise存起来
        return new MyPromise((resolved: Function, rejected: Function) => {
                // 这里通过立即执行函数，得到外部的决议函数，在内部返回调用这个决议函数（通过闭包）
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
}
```
这样来看，代码完整了很多，但是仍然不够完整，我们可以测试一下代码：
```javascript
let mp = new MyPromise(function (resolve, reject) {
    resolve('2');
    console.log('1')
});
mp.then(data => console.log(data));
console.log('3')
```
以正常的Promise运行流程，上述结果的是``1 3 2``，但是我们测试自己的代码时，不出意外是下面的结果:
![在这里插入图片描述](https://img-blog.csdnimg.cn/20190919195624486.png)
为什么会造成上述的结果呢？因为我们在执决议函数``resolved``和``rejected``的时候是同步决议的，就会造成决议和实例化MyPromise时的时间是一致的，所以我们需要给决议函数加上setTimeout进行限制。
```javascript
protected resolved = (data: any): any => {
   // pending => rejected
   // 利用setTimeout实现内部的异步晚于外部的同步
   setTimeout(() => {
	    if (this.status === 'pending') {
	        this.data = data;
	        this.status = 'resolved';
	        // 同步决议完成之后，执行异步队列的决议函数
	        this.resolvedArray.forEach((fn: Function) => fn())
	    }
    })
};

protected rejected = (data: any): any => {
   // pending => rejected
   setTimeout(() => {
	    if (this.status === 'pending') {
	        this.data = data;
	        this.status = 'rejected';
	        this.rejectedArray.forEach((fn: Function) => fn())
	    }
    })
};
```
这样就可以完成正常Promise的执行流程。
#### catch和finally的实现
catch即当决议失败时的特殊处理函数。
```javascript
// catch即返回没有第一个参数的this.then的调用
public catch = (onRejected: Function): MyPromise => {
    return this.then(null, onRejected)
};
// finally即两个参数都有的决议
public finally = (fn: Function): MyPromise => {
    return this.then(
        (value: any) => this.resolved(fn(value)),
        (err: any) => this.rejected(fn(err))
    );
};
```
源码如下：
```javascript
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
```
如果有优化的方案还请指正，多谢。