'use client';
import React, { useEffect, useState } from 'react';
import styles from "./gallarySection.module.scss";
import Image from 'next/image';
import { GrFormClose } from 'react-icons/gr';
import { HiArrowLongLeft, HiArrowLongRight } from "react-icons/hi2";
import { BiChevronLeftCircle,BiChevronRightCircle } from "react-icons/bi"
import LightBox from './LightBox/LightBox';

const GallarySection = () => {
    const [currentIndex,setCurrentIndex]=useState(0)

    const images = [
      {
        id: "1",
        category: "Wedding event",
        img: "https://images.unsplash.com/photo-1502635385003-ee1e6a1a742d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=387&q=80",
      },
      {
        id: "2",
        category: "Corporate event",
        img: "https://images.unsplash.com/photo-1530023367847-a683933f4172?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=387&q=80",
      },
      {
        id: "3",
        category: "Theme decor",
        img: "https://images.unsplash.com/photo-1631857455684-a54a2f03665f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=870&q=80",
      },
      {
        id: "4",
        category: " Birthday Celebration",
        img: "https://images.unsplash.com/photo-1623788452350-4c8596ff40bb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1470&q=80",
      },
      {
        id: "5",
        category: "Wedding event",
        img: "https://images.unsplash.com/photo-1595407753234-0882f1e77954?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=870&q=80",
      },
      {
        id: "6",
        category: "Corporate event",
        img: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=774&q=80",
      },
      {
        id: "7",
        category: "Theme decor",
        img: "https://images.unsplash.com/photo-1523301343968-6a6ebf63c672?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=869&q=80",
      },
      {
        id: "8",
        category: " Birthday Celebration",
        img: "https://images.unsplash.com/photo-1574155376612-bfa4ed8aabfd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=870&q=80",
      },
    ];
    const [galleryData, setGalleryData] = useState(images);
    const getValue = (item) =>{
        setCurrentIndex(item);
        setLightBox(true);
        console.log(item)
    }
    const[lightBox,setLightBox] = useState(false);
     const nextBtn = () =>{
      setCurrentIndex((oldPerson)=>{
        const result = (oldPerson + 1) % galleryData.length;
        return result
      })
    }
      const prevBtn = () =>{
      setCurrentIndex((oldPerson)=>{
        const result = (oldPerson - 1 + galleryData.length) % galleryData.length;
        return result
      })
    }
  useEffect(() => {
    if (lightBox) {
      document.body.style.overflow = "hidden";
      document.body.style.maxHeight = "100vh";
      // document.body.style.paddingRight = "15px";
    }
    return () => {
      document.body.style.overflow = "unset";
      document.body.style.maxHeight = "auto";

      // document.body.style.paddingRight = "0px";
    };
  }, [lightBox]);
  // category data 
  const category = ["All", ...new Set(images.map((item)=>item?.category))];
  const [active,setActive] =  useState("All")
  const handleCategory = (elem)=>{
    if(elem === "All"){
      setGalleryData(images)
      setActive("All")
      return;
    }
    const newGalleryData = images.filter((item)=>item.category === elem);
    setGalleryData(newGalleryData);
    setActive(elem)
  }
  return (
    <>
      <section className={styles.gallaryWrapper}>
        <div className={styles.headingWrapper}>
          <p className="text-[16px] font-semibold uppercase text-[#cda45e] text-center">
            Portfolio
          </p>
          <h2 className="text-[40px] font-semibold text-[#000] leading-[50px] mb-[25px] text-center">
            Our Latest Events
          </h2>
        </div>
        {/* === heading Btn start === */}
          <div className={styles?.categoryBtn}>
            {category?.map((category) => {
              return (
                <>
                  <button
                    key={category}
                    className={active === category && styles.activeBtn}
                    onClick={() => handleCategory(category)}
                  >
                    {category}
                  </button>
                </>
              );
            })}
          </div>

        {/* === heading Btn end === */}

        <div className={styles.mainDiv}>
          {galleryData?.map((value, index) => {
            return (
              <>
                <div
                  className={styles.mainImage}
                  key={value?.id}
                  onClick={() => getValue(index)}
                >
                  <Image src={value?.img} alt="12" fill={"fill"} />
                </div>
              </>
            );
          })}
        </div>
        {lightBox && (
          <LightBox lightBox={lightBox}>
            <div className={styles.lightImage}>
              <div className={styles.lightImageWrapper}>
                <Image
                  src={galleryData[currentIndex].img}
                  width={500}
                  height={500}
                />
              </div>
            </div>
            <div
              className={styles.closeIcon}
              onClick={() => {
                setLightBox(false);
              }}
            >
              <GrFormClose className={styles?.closeSvg} />
            </div>
            <div className={styles.leftArrow} onClick={prevBtn}>
              <HiArrowLongLeft />
            </div>
            <div className={styles.rightArrow} onClick={nextBtn}>
              <HiArrowLongRight />
            </div>
          </LightBox>
        )}
      </section>
    </>
  );
}

export default GallarySection
