import {useId} from 'react';
import Image from 'next/image';
import type {StudyBackdrop} from '@/lib/study/types';
import {sceneryOptions} from '@/lib/study/scenery-options';

export function SceneryThumbnail({city}:{city:StudyBackdrop}) {
  const id=useId().replaceAll(':',''),palette=sceneryOptions.find(item=>item.id===city)!;
  if(palette.photo)return <Image src={palette.photo} width={160} height={90} alt="" sizes="(max-width:700px) 70px, 140px"/>;
  return <svg viewBox="0 0 160 90" width="160" height="90" aria-hidden="true">
    <defs><linearGradient id={id} x2="0" y2="1"><stop stopColor={palette.sky}/><stop offset="1" stopColor={palette.horizon}/></linearGradient></defs>
    <rect width="160" height="90" rx="8" fill={`url(#${id})`}/>
    <path d="M0 66 30 24l28 40L86 18l41 47 17-25 16 26v24H0Z" fill="#879b76"/>
    <path d="m0 77 24-30 19 26 35-32 43 34 28-30 11 30v15H0Z" fill="#617955"/>
  </svg>;
}
