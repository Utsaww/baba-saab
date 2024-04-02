'use client';
import React, { useRef, useState } from 'react';
import styles from "./mainSlider.module.scss"
// Import Swiper React components
import { Swiper, SwiperSlide } from 'swiper/react';

// Import Swiper styles
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';

// import './styles.css';

// import required modules
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import Image from 'next/image';
import slide1 from "../../../assets/mp4.jpg";
import slide2 from "../../../assets/slider2.jpg";
import slide3 from "../../../assets/slide3.jpg";

const MainSlider = () => {
    const progressCircle = useRef(null);
  const progressContent = useRef(null);
  const onAutoplayTimeLeft = (s, time, progress) => {
    progressCircle.current.style.setProperty('--progress', 1 - progress);
    progressContent.current.textContent = `${Math.ceil(time / 500)}s`;
  };
  return (
    <>
      <div className={styles.mainWrapper}>
        <Swiper
          spaceBetween={30}
          centeredSlides={true}
          autoplay={{
            delay: 5000,
            disableOnInteraction: false,
          }}
          pagination={{
            clickable: true,
          }}
          modules={[Autoplay, Pagination]}
          onAutoplayTimeLeft={onAutoplayTimeLeft}
          className="mySwiper"
        >
          <SwiperSlide>
            <div className={styles.imageWrapper}></div>
            <Image src={slide1} />
            <div className={styles.content}>
              <h3>Wedding planner</h3>
              <p>
                Your perfect day, meticulously planned. At Baba Saab Event
                Company, we specialize in turning dreams into reality. From
                intimate ceremonies to grand celebrations, our experienced team
                is dedicated to crafting unforgettable moments tailored to your
                unique love story.
              </p>
            </div>
          </SwiperSlide>

          <SwiperSlide>
            <div className={styles.imageWrapper}></div>
            <Image src={slide2} />
            <div className={styles.content}>
              <h3>Event Planner</h3>
              <p>
                From concept to execution, we orchestrate unforgettable
                experiences. At Baba Saab Event Company, creativity meets
                precision to craft seamless and extraordinary events. Whether
                it's a corporate gathering, product launch, or social
                celebration, our expert team is dedicated to bringing your
                vision to life. 
              </p>
            </div>
          </SwiperSlide>
          <SwiperSlide>
            <div className={styles.imageWrapper}></div>
            <Image src={slide3} />
            <div className={styles.content}>
              <h3>Birthday celebration</h3>
              <p>
                Make every birthday an unforgettable celebration with Baba Saab
                Event Company. From milestone moments to intimate gatherings, we
                specialize in creating magical experiences tailored to you.
                Whether it's a whimsical children's party, a stylish adult
                soirée, or anything in between, our team of experts is here to
                turn your birthday dreams into reality. 
              </p>
            </div>
          </SwiperSlide>
          <div className={styles.autoplayProgress} slot="container-end">
            <svg viewBox="0 0 48 48" ref={progressCircle}>
              <circle cx="24" cy="24" r="20"></circle>
            </svg>
            <span ref={progressContent}></span>
          </div>
        </Swiper>
      </div>
    </>
  );
}

export default MainSlider
