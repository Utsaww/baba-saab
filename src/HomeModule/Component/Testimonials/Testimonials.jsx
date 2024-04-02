"use client";
import React, { useRef, useState } from "react";
import styles from "./Testimonials.module.css";
import { Swiper, SwiperSlide } from "swiper/react";

// Import Swiper styles
import "swiper/css";
import "swiper/css/pagination";

// import required modules
import { Pagination, Autoplay } from "swiper/modules";
import Image from "next/image";

const Testimonials = () => {
  const ReviewData = [
    {
      id: 1,
      image:
        "https://images.unsplash.com/photo-1499887142886-791eca5918cd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=580&q=80",
      name: "Steven Chole",
      post: "Client",
      content:
        "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Voluptatum beatae esse ipsa laboriosam aut maxime earum  ",
    },
    {
      id: 2,
      image:
        "https://images.unsplash.com/photo-1499887142886-791eca5918cd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=580&q=80",
      name: "Steven Chole",
      post: "Client",
      content:
        "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Voluptatum beatae esse ipsa laboriosam aut maxime earum  ",
    },
    {
      id: 3,
      image:
        "https://images.unsplash.com/photo-1499887142886-791eca5918cd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=580&q=80",
      name: "Steven Chole",
      post: "Client",
      content:
        "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Voluptatum beatae esse ipsa laboriosam aut maxime earum  ",
    },
    {
      id: 4,
      image:
        "https://images.unsplash.com/photo-1499887142886-791eca5918cd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=580&q=80",
      name: "Steven Chole",
      post: "Client",
      content:
        "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Voluptatum beatae esse ipsa laboriosam aut maxime earum  ",
    },
    {
      id: 5,
      image:
        "https://images.unsplash.com/photo-1499887142886-791eca5918cd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=580&q=80",
      name: "Steven Chole",
      post: "Client",
      content:
        "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Voluptatum beatae esse ipsa laboriosam aut maxime earum  ",
    },
    {
      id: 6,
      image:
        "https://images.unsplash.com/photo-1499887142886-791eca5918cd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=580&q=80",
      name: "Steven Chole",
      post: "Client",
      content:
        "Lorem ipsum dolor, sit amet consectetur adipisicing elit. Voluptatum beatae esse ipsa laboriosam aut maxime earum  ",
    },
  ];
  return (
    <>
      <section className={styles.testimonialSection}>
        <div className={styles.headingWrapper}>
          <p className="text-[16px] font-semibold uppercase text-[#cda45e] ">
            TESTIMONIALS
          </p>
          <h2 className="text-[40px] font-semibold text-[#000] leading-[50px] mb-[25px]">
            What they're saying about us
          </h2>
        </div>
        <div className={styles.testimonialWrapper}>
          <Swiper
            // slidesPerView={1}
            spaceBetween={30}
            pagination={{
              clickable: true,
            }}
            autoplay={{
              delay: 2500,
              disableOnInteraction: false,
            }}
            modules={[Pagination, Autoplay]}
            breakpoints={{
              320: {
                slidesPerView: 1,
              },
              768: {
                slidesPerView: 2,
              }
            }}
            className="mySwiper"
          >
            {ReviewData?.map((value) => {
              return (
                <>
                  <SwiperSlide key={value?.id}>
                    <div className={styles.testContent}>
                      <p className={styles.testContentP}>{value?.content}</p>
                      <div className={styles.testName}>
                        <div className={styles.userImage}>
                          <Image src={value?.image} height={60} width={60} />
                        </div>
                        <div className={styles.testNameContent}>
                          <h5>{value?.name}</h5>
                          <p>{value?.post}</p>
                        </div>
                      </div>
                    </div>
                  </SwiperSlide>
                </>
              );
            })}
          </Swiper>
        </div>
      </section>
    </>
  );
};

export default Testimonials;
