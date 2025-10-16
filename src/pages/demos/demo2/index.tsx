/* 练习1：鼠标点击溅射表情 */
import DotParticleCanvas from '@/pages/demos/demo2/components/DotParticleCanvas'


export default function DemoTwo() {
  return (
    <div className="border-2 border-solid border-gray-300 w-[500px] h-[500px]" id="touBi">
      <DotParticleCanvas containerWidth={200} containerHeight={200}  />
    </div>
  )
}
