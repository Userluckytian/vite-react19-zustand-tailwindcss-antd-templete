import { useState, useOptimistic, useTransition, Activity } from 'react';

export default function UseOptimisticHook() {

    // 总结： useOptimistic依赖useState，所以这俩要一起定义（我们可以看到页面渲染的代码中并没有使用realLikes， 你可以理解为，我们定义的optimisticLikes就是页面渲染的realLikes）
    const [realLikes, setRealLikes] = useState<number>(10);
    const [optimisticLikes, addOptimisticLike] = useOptimistic(
        realLikes,
        (currentLikes, amount: number) => currentLikes + amount
    );


    const [isPending, startTransition] = useTransition();


    const [error, setError] = useState<any>(null);



    const mockLikeAPI = () => new Promise((resolve, reject) => {
        setTimeout(() => {
            Math.random() > 0.5
                ? resolve(true)
                : reject(new Error('点赞失败，请重试'));
        }, 800);
    });

    const handleLike = async () => {
        startTransition(async () => {
            if (isPending) return;

            // 乐观更新
            addOptimisticLike(1);
            setError(null);

            try {
                await mockLikeAPI();
                setRealLikes(prev => prev + 1);
            } catch (err: any) {
                // 不需要手动回退，useOptimistic 会自动回退
                setError("点赞失败：" + err.message);
            }
        });
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <button onClick={handleLike} disabled={isPending}>
                点赞 {optimisticLikes} ❤️
            </button>
            
            {/* before写法 */}
            {/* {error && <p style={{ color: 'red' }}>{error}</p>} */}
            {/* after写法 */}
            <Activity mode={error ? "visible" : "hidden"}>
                <p style={{ color: 'red' }}>{error}</p>
            </Activity>
        </div>
    );
}