import Image from 'next/image';
import type {StudyBackdrop} from '@/lib/study/types';
import {sceneryOptions} from '@/lib/study/scenery-options';

export function SceneryThumbnail({city}:{city:StudyBackdrop}) {
  const palette=sceneryOptions.find(item=>item.id===city)!;
  return <Image src={palette.photo} width={160} height={90} alt="" sizes="(max-width:700px) 60px, 140px"/>;
}
