import sys

def update_keyboard():
    with open('src/mykeyboard.cpp', 'r') as f:
        content = f.read()

    # Search pattern matches lines 784-793
    search_str = """                    // else if (y == -1 && x >= buttons_number) x = buttons_number - 1;
                    // else if (x < 0) x = KeyboardWidth - 1;

                    redraw = true;
                }
            }
#endif
        } // end of physical input detection

        if (selection_made) { // if something was selected then handle it"""

    replace_str = """                    // else if (y == -1 && x >= buttons_number) x = buttons_number - 1;
                    // else if (x < 0) x = KeyboardWidth - 1;

                    redraw = true;
                }
            }
#elif defined(HAS_BTN)
            if (check(SelPress)) {
                selection_made = true;
            } else {
                /* Down Btn to move in X axis (to the right) */
                if (check(NextPress) && touchPoint.pressed == false) {
                    if (EscPress) {
                        y++;
                    } else if ((x >= buttons_number - 1 && y <= -1) || (x >= KeyboardWidth - 1 && y >= 0)) {
                        // if we are at the end of the current line
                        y++;   // next line
                        x = 0; // reset to first key
                    } else x++;

                    if (y >= KeyboardHeight)
                        y = -1; // if we are at the end of the keyboard, then return to the top

                    if (y == -1 && x >= buttons_number) x = 0;

                    redraw = true;
                }
                /* PREV "Btn" to move backwards on th X axis (to the left) */
                if (check(PrevPress) && touchPoint.pressed == false) {
                    if (EscPress) {
                        y--;
                    } else if (x <= 0) {
                        y--;
                        if (y == -1) x = buttons_number - 1;
                        else x = KeyboardWidth - 1;
                    } else x--;

                    if (y < -1) { // go back to the bottom right of the keyboard
                        y = KeyboardHeight - 1;
                        x = KeyboardWidth - 1;
                    }

                    redraw = true;
                }
            }
#endif
        } // end of physical input detection

        if (selection_made) { // if something was selected then handle it"""

    new_content = content.replace(search_str, replace_str)

    if new_content == content:
        print("String not found. Replace failed.")
    else:
        with open('src/mykeyboard.cpp', 'w') as f:
            f.write(new_content)
        print("Replaced successfully.")

if __name__ == "__main__":
    update_keyboard()
